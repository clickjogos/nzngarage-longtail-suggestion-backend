const mongodbConnector = require('../connectors/mongodbConnector.js')
const _ = require('lodash')
const { options } = require('../routes/keyWordsRoutes.js')
const { searchKeywordsListByCompetitor } = require('./semRushController')

//getKeyWords - retrieves the key words list from database based on the filtering parameters
async function getKeyWords(params) {
	try {
		let mongoSearchObject = {
			collection: 'semrush-results',
			query: {
				main: true,
				active: {
					"$ne": false
				}
			}
		}

		if (params.domain) {
			mongoSearchObject.query['competitor'] = params.domain
		}

		//if page parameter is sent, set it for the query
		if (params.resultsPerPage && params.currentPage) {
			mongoSearchObject['page'] = {
				size: parseInt(params.resultsPerPage),
				current: parseInt(params.currentPage),
			}
		}

		//if sorting parameters are sent, set them for the query
		if (params.orderBy && params.orderType) {
			let orderByList = params.orderBy.split(',')
			let orderTypeList = params.orderType.split(',')
			if (orderByList.length != orderByList.length) throw new Error('Invalid ordering parameters, please ensure you have a single type for each orderer')
			mongoSearchObject['sort'] = {}
			orderByList.map((orderField) => {
				let indexOfField = orderByList.indexOf(orderField)
				switch (orderTypeList[indexOfField]) {
					case 'asc':
						mongoSearchObject['sort'][orderField] = 1
						break
					case 'desc':
						mongoSearchObject['sort'][orderField] = -1
						break
					default:
						throw new Error('Invalid sorting parameter')
				}
			})
		}

		let competitors = await mongodbConnector.list(mongoSearchObject)
		let onlyMainKeywords = competitors.list

		let selectedKeywords = []
		await onlyMainKeywords.map(row => {
			let keywordToFind = row.Keyword
			selectedKeywords.push({ Keyword: keywordToFind })
		})

		let secondaryCompetitors = await mongodbConnector.find({
			collection: 'semrush-results',
			query: {
				$and: [
					{ main: false },
					{ $or: selectedKeywords }
				]
			}
		})

		let allKeywords = [...onlyMainKeywords, ...secondaryCompetitors]
		let keywordsGroupped = _(allKeywords)
			.groupBy('Keyword')
			.map(function (group, key) {
				return {
					Keyword: key,
					simplyfiedKeyword: group[0]["simplyfiedKeyword"],
					"Number of Results": group[0]["Number of Results"],
					"nznPosition": group[0]["nznPosition"],
					"Search Volume": group[0]["Search Volume"],
					"ctr": group[0]["ctr"],
					competitors: group
				}
					;
			})
			.value()

		let keysToRemove = ['ctr', 'Number of Results', 'Search Volume', 'nznPosition', 'Keyword', 'simplyfiedKeyword']
		keywordsGroupped.map((kwGroup, indexGroup) => {
			keysToRemove.map(key => {
				kwGroup.competitors.map((competitor, indexCompetitor) => {
					delete keywordsGroupped[indexGroup].competitors[indexCompetitor][key]
				})
			})
		})

		var keyWords = {
			keyWordsArray: [],
			currentPage: competitors.page.current,
			totalPages: Math.ceil(competitors.page.total / competitors.page.size),
			totalRows: competitors.page.total

		}
		if (competitors) {
			keywordsGroupped.map(keyword => {
				keyWords.keyWordsArray.push(keyword)
			})
			return keyWords
		} else {
			// keyword search in case we need to return a non-listed competitor
			// let semRushResults = await searchKeywordsListByCompetitor(params)
			// keyWords.keyWordsArray.push(semRushResults)
			return keyWords
		}
	} catch (error) {
		console.log(error)
		throw new Error(err)
	}
}

// setWeeklySchedule - creates a weekly keyword schedule in the database
async function setWeeklySchedule(params) {
	try {
		//determine current week start date and check if there are existing scheudles
		let currentDate = new Date()
		let startDate = new Date()
		let weekdayNumber = currentDate.getDay()
		startDate.setDate(currentDate.getDate() - weekdayNumber)
		startDate.setHours(0, 0, 0, 0)

		let plans = await mongodbConnector.list({
			collection: 'week-plans',
			query: {
				weekStartDate: {
					$gte: startDate,
				},
			},
		})

		let scheduleObject
		if (plans.list.length > 0) {
			//update existing schedule
			scheduleObject = plans.list[0]
			await reactivateRemovedKeywords(scheduleObject.scheduledKeywords, params.selectedKeywords)
			scheduleObject.scheduledKeywords = []
		} else {
			//create a new one
			scheduleObject = {
				weekStartDate: startDate,
				lastUpdate: currentDate,
				scheduledKeywords: [],
			}
		}
		await deactivateScheduledKeywordsFromList(params.selectedKeywords)
		params.selectedKeywords.map((keywordObject) => {
			if (keywordObject.active != undefined) delete keywordObject.active
			keywordObject['title'] = keywordObject.title ? keywordObject.title : ''
			keywordObject['simplyfiedTitle'] = keywordObject.title.normalize('NFD').replace(/[\u0300-\u036f]/g, "");
			keywordObject['tag'] = keywordObject.tag ? keywordObject.tag : ''
			keywordObject['internalBacklinks'] = keywordObject.internalBacklinks ? keywordObject.internalBacklinks : []
			scheduleObject.scheduledKeywords.push(keywordObject)
		})

		//update current week schedule
		if (scheduleObject._id) {
			await mongodbConnector.updateOne(
				{
					collection: 'week-plans',
					filter: {
						_id: scheduleObject._id,
					},
					update: {
						$set: {
							weekStartDate: scheduleObject.weekStartDate,
							lastUpdate: currentDate,
							scheduledKeywords: scheduleObject.scheduledKeywords,
						},
					},
				},
				true
			)
		}

		//create current week schedule
		else {
			await mongodbConnector.save({
				collection: 'week-plans',
				document: scheduleObject,
			})
		}

		return scheduleObject
	} catch (error) {
		console.log(error)
		throw new Error(err)
	}
}

// updateWeeklySchedule - updates a weekly keyword schedule in the database
async function updateWeeklySchedule(params) {
	try {
		let schedulesToUpdate = params.schedule
		let dbResult = await mongodbConnector.updateManyById({
			collection:"week-plans",
			documents:schedulesToUpdate
		})
		return dbResult
		
	} catch (error) {
		console.log(error)
		throw new Error(err)
	}
}



// retrieveWeeklySchedule - retrieves a weekly keyword schedule in the database
// the date parameters must be in the format "YYYY-MM-DD"
async function retrieveWeeklySchedule(params) {
	try {

		let mongoSearchObject = setupMongoFilters(params, 'week-plans')


		//if the user specify intervals, retrieve every object in that date interval
		if (params.startDate && params.endDate) {
			mongoSearchObject.query['weekStartDate'] = setDateIntervalFilter(params.startDate, params.endDate)
		}

		if (params.tag) {
			mongoSearchObject.query['tag'] = params.tag
		}

		if (params.keywordFilter || params.titleFilter) {
			mongoSearchObject.query['scheduledKeywords'] = {
				"$elemMatch": {
				}
			}
		}

		if (params.keywordFilter) {
			let reducedKeywordFilter = params.keywordFilter.normalize('NFD').replace(/[\u0300-\u036f]/g, "");
			mongoSearchObject.query.scheduledKeywords["$elemMatch"]["simplyfiedKeyword"] = new RegExp(reducedKeywordFilter, 'i')
		}

		if (params.titleFilter) {
			let reducedTitleFilter = params.titleFilter.normalize('NFD').replace(/[\u0300-\u036f]/g, "");
			mongoSearchObject.query.scheduledKeywords["$elemMatch"]["simplyfiedTitle"] = new RegExp(reducedTitleFilter, 'i')
		}

		//if date not specified, get for the current week
		else {
			let weekStartDate = getCurrentWeekStartDate();
			mongoSearchObject.query['weekStartDate'] = {
				$gte: weekStartDate,
			}
		}
		let plans = await mongodbConnector.list(mongoSearchObject)

		let result = {
			schedule: updateKeywordsWithFilterSignal(plans.list, params),
		}



		return result
	} catch (error) {
		console.log(error)
		throw new Error(err)
	}
}

function updateKeywordsWithFilterSignal(scheduleList, params) {
	let keyWordRegex = null
	let titleRegex = null
	if (params.keywordFilter) {
		let reducedKeywordFilter = params.keywordFilter.normalize('NFD').replace(/[\u0300-\u036f]/g, "");
		keyWordRegex = new RegExp(reducedKeywordFilter, 'i')
	}

	if (params.titleFilter) {
		let reducedTitleFilter = params.titleFilter.normalize('NFD').replace(/[\u0300-\u036f]/g, "");
		titleRegex = new RegExp(reducedTitleFilter, 'i')
	}

	let updatedScheduleList = scheduleList.map(schedule => {
		schedule.scheduledKeywords = schedule.scheduledKeywords.map((keywordObject) => {
			if (keyWordRegex) {
				if (keywordObject.simplyfiedKeyword.match(keyWordRegex)) {
					keywordObject['filter'] = true;
				}
			}
			if (titleRegex) {
				if (keywordObject.simplyfiedTitle.match(titleRegex)) {
					keywordObject['filter'] = true;
				}
			}
			return keywordObject
		})
		return schedule
	})
	return updatedScheduleList
}

// disqualifyKeywords - classify a given KW and its competitor as disqualified
async function disqualifyKeywords(params) {
	try {
		let currentDate = new Date()

		let keyword = params.keyword
		let competitor = params.domain

		keyword = keyword.trim()
		competitor = competitor.trim()

		/* Find all keyword's documents related  */
		let keywordDocuments = await mongodbConnector.find({
			collection: 'semrush-results',
			query: { Keyword: keyword },
		})

		let documentToRemove = keywordDocuments.filter(document => document.competitor == competitor)[0]
		if (keywordDocuments.length != 0 && documentToRemove) {
			if (!documentToRemove.main || keywordDocuments.length == 1) {
				await mongodbConnector.deleteOne({
					collection: 'semrush-results',
					query: { Keyword: keyword, competitor: competitor },
				})
			} else {
				let oldMin = documentToRemove.competitorPosition
				let onlyCompetitorsPosition = await keywordDocuments.map((document) => {
					if (document.competitorPosition != oldMin) return document.competitorPosition
					else return 999
				})
				let newMin = Math.min(...onlyCompetitorsPosition)
				let documentToUpdate = keywordDocuments.filter(document => document.competitorPosition == newMin)[0]

				await mongodbConnector.deleteOne({
					collection: 'semrush-results',
					query: { _id: documentToRemove._id },
				})
				await mongodbConnector.updateOne({
					collection: 'semrush-results',
					filter: {
						_id: documentToUpdate._id,
					},
					update: { $set: { main: true } }
				})
			}

			await mongodbConnector.save({
				collection: 'disqualified-keywords',
				document: { Keyword: keyword, competitor: competitor, createAt: currentDate },
			})

			return { keyword, competitor }
		}
		else if (keywordDocuments.length != 0 && !documentToRemove) {
			throw new Error(`Competitor ${competitor} is invalid, please ensure to send valid parameters`)
		}
		else {
			throw new Error(`The keyword ${keyword} was already disqualified for competitor ${competitor}, please ensure to send valid parameters`)
		}



	} catch (error) {
		console.log(error)
		throw (error.message)
	}
}

function getCurrentWeekStartDate() {
	let currentDate = new Date();
	let currentWeekStartDate = new Date()
	let weekdayNumber = currentDate.getDay()
	currentWeekStartDate.setDate(currentDate.getDate() - weekdayNumber)
	currentWeekStartDate.setHours(0, 0, 0, 0);
	return currentWeekStartDate
}

//setDateIntervalFilters receives two date strings in the YYYY-MM-DD format and returns a mongo-formated date filter 
function setDateIntervalFilter(startDate, endDate) {
	try {
		var startDateFilter = new Date(startDate)
		var endDateFilter = new Date(endDate)
		startDateFilter.setHours(0, 0, 0, 0);
		endDateFilter.setHours(23, 59, 59, 999);
		let filterObject = {
			"$gte": startDateFilter,
			"$lte": endDateFilter
		}
		return filterObject
	} catch (error) {
		throw new Error("Invalid date format for parameters\nERROR:\n" + JSON.stringify(error))
	}
}


function setupMongoFilters(requestParameters, collectionName) {
	let mongoSearchObject = {
		collection: collectionName,
		query: {}
	}

	//if page parameter is sent, set it for the query
	if (requestParameters.resultsPerPage && requestParameters.currentPage) {
		mongoSearchObject['page'] = {
			size: parseInt(requestParameters.resultsPerPage),
			current: parseInt(requestParameters.currentPage)
		}
	}

	//if sorting parameters are sent, set them for the query
	if (requestParameters.orderBy && requestParameters.orderType) {
		let orderByList = requestParameters.orderBy.split(',')
		let orderTypeList = requestParameters.orderType.split(',')
		if (orderByList.length != orderByList.length) throw new Error("Invalid ordering parameters, please ensure you have a single type for each orderer")
		mongoSearchObject['sort'] = {}
		orderByList.map((orderField) => {
			let indexOfField = orderByList.indexOf(orderField)
			switch (orderTypeList[indexOfField]) {
				case "asc":
					mongoSearchObject['sort'][orderField] = 1
					break;
				case "desc":
					mongoSearchObject['sort'][orderField] = -1
					break;
				default:
					throw new Error('Invalid sorting parameter')
			}
		})
	}
	return mongoSearchObject
}


async function reactivateRemovedKeywords(existingList, updatedKeywords) {
	try {
		let restorationNeeded = false;
		let itemsToRestore = existingList.map((keywordObject) => {
			let objectFound = updatedKeywords.filter((scheduleObject) => {
				return scheduleObject.Keyword == keywordObject.Keyword
			})
			if (objectFound.length == 0) {
				restorationNeeded = true;
				return {
					"Keyword": keywordObject.Keyword,
					"competitor": keywordObject.competitor
				}
			}
		})

		if(restorationNeeded) await mongodbConnector.updateMany({
			collection: "semrush-results",
			filter: {
				"$or": itemsToRestore
			},
			update: {
				"$set": {
					"active": true
				}
			}
		})
		return
	} catch (error) {
		throw new Error("Unable to restore removed keywords\nERROR:\n" + JSON.stringify(error))
	}

}


async function deactivateScheduledKeywordsFromList(insertedKeywords) {
	try {
		let filterObject = {
			"$or": []
		}
		let itemsToRemove = insertedKeywords.map((keywordObject) => {
			return {
				"Keyword": keywordObject.Keyword,
				"competitor": keywordObject.competitor
			}
		})

		filterObject["$or"] = itemsToRemove
		await mongodbConnector.updateMany({
			collection: "semrush-results",
			filter: filterObject,
			update: {
				"$set": {
					"active": false
				}
			}
		})
		return
	} catch (error) {
		throw new Error("Unable to restore removed keywords\nERROR:\n" + JSON.stringify(error))
	}

}



module.exports = {
	getKeyWords,
	setWeeklySchedule,
	retrieveWeeklySchedule,
	disqualifyKeywords,
	updateWeeklySchedule
}
