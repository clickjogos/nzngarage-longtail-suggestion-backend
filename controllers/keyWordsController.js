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
				main: true
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
		await onlyMainKeywords.map( row => {
			let keywordToFind = row.Keyword
			selectedKeywords.push({Keyword: keywordToFind})
		})

		let secondaryCompetitors = await mongodbConnector.find({
			collection: 'semrush-results',
			query: {
				$and: [ 
					{main: false},
					{$or: selectedKeywords}
				]
			}
		})

		let allKeywords = [...onlyMainKeywords, ...secondaryCompetitors ]
		let keywordsGroupped = _(allKeywords)
			.groupBy('Keyword')
			.map(function(g, key) { 
				return {
					Keyword: key,
					"Number of Results": g[0]["Number of Results"],
					"nznPosition": g[0]["nznPosition"],
					"Search Volume": g[0]["Search Volume"],
					competitors: g,
				}
			;})
			.value()

		let keysToRemove = ['ctr', 'Number of Results', 'Search Volume', 'nznPosition', 'Keyword']
			keywordsGroupped.map( (kwGroup, indexGroup)=>{
				keysToRemove.map( key =>{ 
					kwGroup.competitors.map( (competitor, indexCompetitor)=>{
						delete keywordsGroupped[indexGroup].competitors[indexCompetitor][key]
				})
			})
		})

		var keyWords = {
			keyWordsArray: [],
		}
		if (competitors) {
			keywordsGroupped.map( keyword =>{
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

// setWeeklySchedule - creates or updates a weekly keyword schedule in the database
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
			scheduleObject.scheduledKeywords = []
		} else {
			//create a new one
			scheduleObject = {
				weekStartDate: startDate,
				lastUpdate: currentDate,
				scheduledKeywords: [],
			}
		}

		params.selectedKeywords.map((keywordObject) => {
			keywordObject['title'] = ''
			keywordObject['tag'] = ''
			keywordObject['internalBacklinks'] = []
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

// retrieveWeeklySchedule - retrieves a weekly keyword schedule in the database
// the date parameters must be in the format "YYYY-MM-DD"
async function retrieveWeeklySchedule(params) {
	try {
		let filterDateQuery

		//if the user specify intervals, retrieve every object in that date interval
		if (params.startDate && params.endDate) {
			try {
				var startDateFilter = new Date(params.startDate)
				var endDateFilter = new Date(params.endDate)
			} catch (error) {
				throw new Error('Invalid date format for parameters\nERROR:\n' + JSON.stringify(error))
			}

			startDateFilter.setHours(0, 0, 0, 0)
			endDateFilter.setHours(23, 59, 59, 999)

			filterDateQuery = {
				weekStartDate: {
					$gte: startDateFilter,
					$lte: endDateFilter,
				},
			}
		}

		//if date not specified, get for the current week
		else {
			let currentDate = new Date()
			let weekStartDate = new Date()
			let weekdayNumber = currentDate.getDay()
			weekStartDate.setDate(currentDate.getDate() - weekdayNumber)
			weekStartDate.setHours(0, 0, 0, 0)
			filterDateQuery = {
				weekStartDate: {
					$gte: weekStartDate,
				},
			}
		}
		let plans = await mongodbConnector.list({
			collection: 'week-plans',
			query: filterDateQuery,
		})

		let result = {
			schedule: plans.list,
		}

		return result
	} catch (error) {
		console.log(error)
		throw new Error(err)
	}
}

// disqualifyKeywords - classify a given KW and its competitor as disqualified
async function disqualifyKeywords(params) {
	try {
		let currentDate = new Date()

		let keyword = params.keyword
		let competitor = params.domain

		keyword = keyword.trim()
		competitor = competitor.trim()

		await mongodbConnector.save({
			collection: 'disqualified-keywords',
			document: { Keyword: keyword, competitor: competitor, createAt: currentDate },
		})

		let keywordDocument = await mongodbConnector.findOne({
			collection: 'semrush-results',
			query: { Keyword: keyword },
		})

		if (keywordDocument.competitor == competitor) {
			await mongodbConnector.deleteOne({
				collection: 'semrush-results',
				query: { Keyword: keyword },
			})
		} else {
			await mongodbConnector.updateOne({
				collection: 'semrush-results',
				filter: {
					_id: keywordDocument._id,
				},
				update: { $pull: { secondaryCompetitors: { competitor: competitor } } },
			})
		}

		return keyword
	} catch (error) {
		console.log(error)
		throw new Error(err)
	}
}

module.exports = {
	getKeyWords,
	setWeeklySchedule,
	retrieveWeeklySchedule,
	disqualifyKeywords,
}