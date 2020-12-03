require('dotenv').config()

const csvtojson = require('csvtojson')

// FUTURE: remove comments to use SEMrush API call
// const { domainVsDomains, organicResults } = require('./connectors/semRushConnector')

const { save, saveMultiple, updateOne, find, findAll, deleteMany } = require('./connectors/mongodbConnector')

// const semRushCollection = 'semrush-results'
const semRushCollection = 'teste-api'

const limitCompetitorPosition = 4
const semRushLimitRows = 20

/* only for tests */
let mockConfigJson1 = require('./mockFiles/mockConfig-group1.json')
let mockConfigJson2 = require('./mockFiles/mockConfig-group2.json')
let mockConfigJson3 = require('./mockFiles/mockConfig-group3.json')

function searchKeywordsList() {
	return new Promise(async (resolve, reject) => {
		try {
			console.log('>>> Starting Job')

			await clearCollection()

			/* get list of competitors separated by group*/
			let allCompetitorsByGroup = await getCompetitorsList()

			/* get list of keywords to disconsider */
			let disqualifiedKeywords = await getDisqualifiedKeywords()
			let alreadyElectedKeywords = await getAlreadyElectedKeywords()
			let keywordsToDisconsider = [...disqualifiedKeywords, ...alreadyElectedKeywords]

			/* Recursive function 
			search all interests keyword, its competitors information and save
			*/
			let savedDocuments = await searchKeywordsListByCompetitorGroup(allCompetitorsByGroup, [], keywordsToDisconsider, 1)

			resolve(savedDocuments)
		} catch (error) {
			reject(error)
		}
	})
}

async function searchKeywordsListByCompetitorGroup(allCompetitorsByGroup, keywordsGroupped, keywordsToDisconsider, groupCategory) {
	try {
		if (allCompetitorsByGroup.length > 0) {

			/* only for tests */
			// let mockFile
			// if(groupCategory==1) mockFile = mockConfigJson1
			// else if (groupCategory==2) mockFile = mockConfigJson2
			// else mockFile = mockConfigJson3
			// let rawDomainsComparison = mockFile.rawDomainsComparison
			// let organicResultsByKeyword = mockFile.organicResultsByKeyword

			let allCompetitorsDetails = allCompetitorsByGroup[0]
			let allCompetitors = Object.values(allCompetitorsByGroup[0]).map((groupCategory) => {
				return groupCategory.map((domain) => {
					return domain.URL
				})
			})

			console.log('>>> Starting step for: ', allCompetitors[0])
			const mainDomain = ['tecmundo.com.br']
			const allDomains = [...mainDomain, ...allCompetitors[0]]
			const numberOfDomains = allDomains.length

			/* create objects to use as SEMrush parameters */
			let queryDomains = ''
			let exportColumns = 'Ph,Nr,Nq'
			let displayFilter = ''
			await allDomains.map((domain, index) => {
				if (index < numberOfDomains - 1) queryDomains = queryDomains + `*|or|${domain}|`
				else queryDomains = queryDomains + `*|or|${domain}`

				exportColumns = exportColumns + `,P${index}`

				if (index !== 0) {
					if (index < numberOfDomains - 1) displayFilter = displayFilter + `-|P${index}|Gt|${limitCompetitorPosition}|+|`
					else displayFilter = displayFilter + `-|P${index}|Gt|${limitCompetitorPosition}`
				}
			})

			// FUTURE: remove comments to use SEMrush API call
			/* get SEMrush domainVsDomains results */
			// let rawDomainsComparison = await domainVsDomains({
			// 	limitRows: semRushLimitRows,
			// 	type: 'domain_domains',
			// 	database: 'br',
			// 	domains: queryDomains,
			// 	exportColumns: exportColumns,
			// 	displayFilter: displayFilter,
			// })

			/* Convert rawDomainsComparison to a JSON */
			let colParser = {
				'Number of Results': 'number',
				'Search Volume': 'number',
				[mainDomain]: 'number',
			}
			allCompetitors[0].map((domain) => {
				colParser[domain] = 'number'
			})
			convertedDomainsComparison = []
			rawDomainsComparison = rawDomainsComparison.map(async (rowGroup) => {
				let rowGroupJson = await convertResultToJson(rowGroup, colParser)
				return convertedDomainsComparison.push(rowGroupJson)
			})
			rawDomainsComparison = await Promise.all(rawDomainsComparison)
			
			let tempArray = convertedDomainsComparison
			convertedDomainsComparison = [];
			tempArray.map((innerArray)=>{
				convertedDomainsComparison.push(...innerArray)
			})

			/* Split each keyword by compared domain, already filtering by better position */
			let splittedKeywordsByDomain = await splitKeywordsByDomain(convertedDomainsComparison, allDomains, mainDomain)

			/* Remove keywords that has the main domain as better position or those keywords to be disconsider*/
			let onlyKeywordsOfInterest = await removeKeywordsCompetitorsToDisconsider(splittedKeywordsByDomain, allDomains, keywordsToDisconsider)
			onlyKeywordsOfInterest = await removeMainDomain(onlyKeywordsOfInterest, allDomains, mainDomain)					

			// FUTURE: remove comments to use SEMrush API call
			/* get SEMrush organicResults results */
			// let keywordsToOrganicSearch = Array.from(onlyKeywordsOfInterest)
			// let organicResultsByKeyword = await queueOrganicResultsByKeyword(keywordsToOrganicSearch, [])

			/* Convert organicResultsByKeyword to a JSON */
			let convertedOrganicResultsByKeyword = organicResultsByKeyword.map(async (row) => {
				let results = await convertResultToJson(row.results, null)
				return { keyword: row.keyword, results: results }
			})
			convertedOrganicResultsByKeyword = await Promise.all(convertedOrganicResultsByKeyword)

			/* Define URL Title  and join its value to Organic Results*/
			let organicResultsWithTitle = await getURlTitle(convertedOrganicResultsByKeyword, Object.values(allCompetitorsDetails)[0])

			/* Join values of keyword, competitor and organic search */
			let keywordAndCompetitorInfos = await joinKeywordAndCompetitorInfos(onlyKeywordsOfInterest, organicResultsWithTitle)

			/* Choose keywords based on title limit */
			let choosenKeywords = await chooseKeywordsByTitleLimit(keywordAndCompetitorInfos, Object.values(allCompetitorsDetails)[0])

			let savedDocuments = await saveOrganicResults(choosenKeywords)
			keywordsGroupped.push(savedDocuments)
			allCompetitorsByGroup.splice(0, 1)
			groupCategory = groupCategory+1
			return await searchKeywordsListByCompetitorGroup(allCompetitorsByGroup, keywordsGroupped, keywordsToDisconsider, groupCategory)
		} else {
			return keywordsGroupped
		}
	} catch (error) {
		throw error
	}
}

async function clearCollection() {
	try {
		await deleteMany({
			collection: semRushCollection,
			document: {},
		})
	} catch (error) {
		throw error
	}
}

async function getCompetitorsList() {
	try {
		let competitors = await findAll({
			collection: 'competitors',
		})

		competitors.map((competitor) => {
			delete competitor._id
		})

		let competitorsByGroup = competitors.reduce((accumulator, item) => {
			item.category.map((category) => {
				let indexOfGroup = accumulator.findIndex((i) => parseInt(Object.keys(i)[0]) === category)

				if (indexOfGroup === -1) {
					accumulator.push({ [category]: [item] })
				} else {
					accumulator[indexOfGroup][Object.keys(accumulator[indexOfGroup])[0]].push(item)
				}
			})

			return accumulator
		}, [])

		return competitorsByGroup
	} catch (error) {
		console.log(error)
		throw new Error(error)
	}
}

async function getDisqualifiedKeywords() {
	try {
		let currentDate = new Date()
		let weekStartDate = new Date()
		let weekdayNumber = currentDate.getDay()

		weekStartDate.setDate(currentDate.getDate() - weekdayNumber)
		weekStartDate.setMonth(currentDate.getMonth() - 3)
		weekStartDate.setHours(0, 0, 0, 0)
		filterDateQuery = {
			createAt: {
				$gte: weekStartDate,
			},
		}

		let disqualifiedKeywords = await find({
			collection: 'disqualified-keywords',
			query: filterDateQuery,
			fieldsToShow: {
				_id: 0,
				createAt: 0,
			},
		})

		return disqualifiedKeywords
	} catch (error) {
		throw error
	}
}

async function getAlreadyElectedKeywords() {
	try {
		let currentDate = new Date()
		let weekStartDate = new Date()
		let weekdayNumber = currentDate.getDay()

		weekStartDate.setDate(currentDate.getDate() - weekdayNumber)
		weekStartDate.setMonth(currentDate.getMonth() - 3)
		weekStartDate.setHours(0, 0, 0, 0)
		filterDateQuery = {
			weekStartDate: {
				$gte: weekStartDate,
			},
			scheduledKeywords: { $exists: true },
		}

		let alreadyElectedKeywords = await find({
			collection: 'week-plans',
			query: filterDateQuery,
			fieldsToShow: {
				'scheduledKeywords.Keyword': 1,
				'scheduledKeywords.competitorInfo.Domain': 1,
			},
		})

		let alreadyElectedKeywordsResponse = []
		alreadyElectedKeywords.map((row) => {
			row.scheduledKeywords.filter((kw) => alreadyElectedKeywordsResponse.push({ Keyword: kw.Keyword, competitor: kw.competitorInfo.Domain }))
		})

		return alreadyElectedKeywordsResponse
	} catch (error) {
		throw error
	}
}

async function convertResultToJson(result, colParser) {
	try {
		let conversionParameters = {
			delimiter: [';'],
			alwaysSplitAtEOL: true,
			trim: true,
			flatKeys: true,
		}
		if (colParser) conversionParameters['colParser'] = colParser
		let convertedResult = await csvtojson(conversionParameters).fromString(result)

		return convertedResult
	} catch (error) {
		throw error
	}
}

async function splitKeywordsByDomain(convertedDomainsComparison, allDomains, mainDomain) {
	try {
		let onlyPositionOfInterest = await convertedDomainsComparison.reduce(function (accumulator, row, array) {
			let onlyDomainsPosition = []
			let objectToPushOnAcc = {}
			if (row['Search Volume'] >= 500) {
				allDomains.map((domain) => { return onlyDomainsPosition.push(row[domain])})
				let min = Math.min(...onlyDomainsPosition)

				let keywordByCompetitor = allDomains.map((domain) => {
					return { competitor: domain }
				})
				let rowKeys = Object.keys(row)
				rowKeys.map((key) => {
					if (allDomains.includes(key)) {
						let indexToModify = keywordByCompetitor.findIndex((item) => item.competitor == key)
						if( (key == [mainDomain]) ){
							objectToPushOnAcc['nznPosition'] = row[key]
							keywordByCompetitor.splice(indexToModify,1)
						} else {
							if (row[key] <= limitCompetitorPosition && !(key == [mainDomain])) {
								keywordByCompetitor[indexToModify]['competitorPosition'] = row[key]
							} else keywordByCompetitor.splice(indexToModify,1)
						}

						objectToPushOnAcc['competitors'] = keywordByCompetitor
					} else {
							objectToPushOnAcc[key] = row[key]
					}
				})
				accumulator.push(objectToPushOnAcc)
				// console.log()
			}
			return accumulator
		}, [])

		// onlyPositionOfInterest = Boolean(...onlyPositionOfInterest)
		return onlyPositionOfInterest
	} catch (error) {
		throw error
	}
}

async function removeKeywordsCompetitorsToDisconsider( onlyKeywordsOfInterest, allDomains, keywordsToDisconsider ) {
	try {
		
		let choosenKeywords =[]
		let x = onlyKeywordsOfInterest.map( (row, indexRow) =>{
			let keyword = row.Keyword
			let newCompetitors2 = []
			let newCompetitors = row.competitors.map( (details, indexDetails) => {
				let competitor = details.competitor				
				let kwExists = keywordsToDisconsider.filter( kw => {
					if(kw.Keyword == keyword && kw.competitor==competitor) {
						console.log(`Disconsidering KW-competitor pair: ${keyword} - ${competitor} `)
						return true
					}
					else return false
				})
				if(kwExists.length == 0 ) newCompetitors2.push(details)
				return newCompetitors2
			})
			
			if(newCompetitors2.length != 0) {
				row.competitors = newCompetitors2
				choosenKeywords.push(row)
			}
			return onlyKeywordsOfInterest
		})

		return choosenKeywords
	} catch (error) {
		throw error
	}
}

async function removeMainDomain(splittedKeywordsByDomain, allDomains, mainDomain) {
	try {
		splittedKeywordsByDomain = await splittedKeywordsByDomain.reduce((accumulator, row) => {
			let onlyDomainsPosition =[]
			onlyDomainsPosition.push(row.nznPosition)
			row.competitors.map( competitor =>{
				return onlyDomainsPosition.push(competitor.competitorPosition)
			} )
			let min = Math.min(...onlyDomainsPosition)
			if( min !== row.nznPosition ){
				let mainIndex = row.competitors.findIndex( competitor => competitor.competitorPosition == min)
				row.competitors.map( (competitor, index) =>{
					if( index == mainIndex ) row.competitors[mainIndex]['main'] = true
					else row.competitors[index]['main'] = false
				})
				accumulator.push(row)
			}  
			 return accumulator
		}, [])

		return splittedKeywordsByDomain
	} catch (error) {
		throw error
	}
}

async function queueOrganicResultsByKeyword(keywordsUngroupped, keywordsOrganicResults) {
	try {
		if (keywordsUngroupped.length > 0) {
			let x = await organicResults({
				phrase: keywordsUngroupped[0].Keyword,
				displayLimit: limitCompetitorPosition,
				exportColumns: 'Dn,Ur,Fk',
			})
			let keyword = keywordsUngroupped[0].Keyword
			keywordsOrganicResults.push({ keyword: keyword, results: x })
			keywordsUngroupped.splice(0, 1)
			return await queueOrganicResultsByKeyword(keywordsUngroupped, keywordsOrganicResults)
		} else {
			return keywordsOrganicResults
		}
	} catch (error) {
		throw error
	}
}

async function getURlTitle(organicResults, allCompetitorsDetails) {
	try {
		let organicResultsMap = await organicResults.map(async (row, index) => {
			let rowsMap = row.results.map(async (result, indexResult) => {
				let competitorDetail = allCompetitorsDetails.filter((competitor) => competitor.URL === result.Domain)
				let url = result.Url.split('/')
				url = url.filter((item) => item)

				let splitPosition = url.length - 1
				let splittedTitle = url[splitPosition].split('-')
				if (competitorDetail[0] && competitorDetail[0].specialTitleTreatment) {
					if (competitorDetail[0].specialTitleTreatment.titlePosition) {
						splitPosition = url.length + competitorDetail[0].specialTitleTreatment.titlePosition
						splittedTitle = url[splitPosition].split('-')
					}
				}
				let title = ''
				splittedTitle.map((word) => {
					title = title + ` ${word}`
				})

				/* Cleaning title */ 
				let normalizedTitle = await normalizeTitle(title, competitorDetail)

				organicResults[index].results[indexResult]['title'] = normalizedTitle
				organicResults[index].results[indexResult]['titleLength'] = splittedTitle.length
			})
			rowsMap = await Promise.all(rowsMap)
			return organicResults
		})

		await Promise.all(organicResultsMap)
		return organicResults
	} catch (error) {
		throw error
	}
}

async function normalizeTitle(title, competitorDetail) {
	try {
		title = title.replace(/.ghtml/, '')
		title = title.replace(/.html/, '')
		title = title.replace(/.htm/, '')
		if( competitorDetail[0] && !competitorDetail[0].specialTitleTreatment ) {
			title =  title.replace(/\b\d{5}\b/, '') 
			title =  title.replace(/\b\d{6}\b/, '') 
			title =  title.replace(/\b\d{8}\b/, '') 
		}	
		title = title.trim()
		return title
	} catch (error) {
		throw error
	}
}

async function joinKeywordAndCompetitorInfos(onlyKeywordsOfInterest, organicResultsWithTitle) {
	try {
		let keywordAndCompetitorInfos = await onlyKeywordsOfInterest.map(async (item, indexItem) => { 
			let organicResultIndex = organicResultsWithTitle.findIndex( row=> row.keyword== item.Keyword)
			await item.competitors.map( async (competitor, indexCompetitor) => {
				let position = competitor.competitorPosition
				item.competitors[indexCompetitor]['competitorInfo'] = organicResultsWithTitle[organicResultIndex].results[position-1]
				item.competitors[indexCompetitor]['ctr'] = await defineCtrValue(position)
			})
			return item 
		})
		keywordAndCompetitorInfos = await Promise.all(keywordAndCompetitorInfos)
		return keywordAndCompetitorInfos
	} catch (error) {
		throw error
	}
}

async function chooseKeywordsByTitleLimit(keywordAndCompetitorInfos, allCompetitorsDetails) {
	try {
		let choosenKeywords = []
		let keywordAndCompetitorInfosMap = await keywordAndCompetitorInfos.map( async (kwInfo, index) =>{
			let newCompetitors = []
			let competitorsMap = await kwInfo.competitors.map( async (competitor, indexCompetitor) =>{
				let competitorDomain = competitor.competitor
				let competitorDetail = allCompetitorsDetails.filter((compet) => compet.URL === competitorDomain)
				let titleLength = competitor.competitorInfo.titleLength

				let choosenCompetitors = []
				if (competitorDetail[0].specialTitleTreatment) {
					if (competitorDetail[0].specialTitleTreatment.ignoreLimit || titleLength >= 4) {
						newCompetitors.push(competitor)
					}
				} else if (titleLength >= 4) {
					newCompetitors.push(competitor)
				} 
				return newCompetitors
			})
			competitorsMap = await Promise.all(competitorsMap)
			kwInfo.competitors = newCompetitors
			if (  newCompetitors.length > 0 ) {
				choosenKeywords.push(kwInfo)
			}
		})
		keywordAndCompetitorInfosMap = await Promise.all(keywordAndCompetitorInfosMap)

		return choosenKeywords
	} catch (error) {
		throw error
	}
}

async function defineCtrValue(competitorPosition) {
	try {
		switch (competitorPosition) {
			case 1:
				return 31.73
			case 2:
				return 24.71
			case 3:
				return 18.66
			case 4:
				return 13.6
		}
	} catch (error) {
		throw error
	}
}
async function saveOrganicResults(organicResults) {
	try {
		let documentsToSave = []

		organicResults.map(async (item) => {
			let competitors = item.competitors
			delete item.competitors
			let comumKeys = Object.keys(item)
			competitors.map( (competitor, indexCompetitor) => {
				comumKeys.map( key =>{
					competitors[indexCompetitor][key] = item[key]
				})
				competitors[indexCompetitor]['simplyfiedKeyword'] = item.Keyword.normalize('NFD').replace(/[\u0300-\u036f]/g, "");
				documentsToSave.push(competitors[indexCompetitor])
			})
		})

		if (documentsToSave.length > 0) {
			let saveResult = await saveMultiple({
				collection: semRushCollection,
				documents: documentsToSave,
			})
			console.log('>>> Ending step')
			console.log('>>> Results')
			console.log(organicResults)
			return saveResult
		} else return
	} catch (error) {
		throw error
	}
}

searchKeywordsList()
	.then((response) => {
		process.exit(0)
	})
	.catch((error) => {
		console.log(error)
		process.exit(1)
	})
