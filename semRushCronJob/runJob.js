require('dotenv').config()

const csvtojson = require('csvtojson')

const { domainVsDomains, organicResults } = require('./connectors/semRushConnector')
const { save, saveMultiple, updateOne, findAll, deleteMany } = require('./connectors/mongodbConnector')

const semRushCollection = 'teste'

const limitCompetitorPosition = 4

/* only for tests */
let mockConfigJson = require('./mockConfig.json')
let rawDomainsComparison = mockConfigJson.rawDomainsComparison
let organicResultsByKeyword = mockConfigJson.organicResultsByKeyword

function searchKeywordsList() {
	return new Promise(async (resolve, reject) => {
		try {
			console.log('>>> Iniciando Job')

			// await clearCollection()

			/* get list of competitors separated by group*/
			let allCompetitorsByGroup = await getCompetitorsList()

			/* Recursive function 
			search all interests keyword, its competitors information and save
			*/
			let savedDocuments = await searchKeywordsListByCompetitorGroup(allCompetitorsByGroup, [])

			resolve(savedDocuments)
		} catch (error) {
			reject(error)
		}
	})
}

async function searchKeywordsListByCompetitorGroup(allCompetitorsByGroup, keywordsGroupped) {
	try {
		if (allCompetitorsByGroup.length > 0) {
			let allCompetitorsDetails = allCompetitorsByGroup
			let allCompetitors = Object.values(allCompetitorsByGroup[0]).map((groupCategory) => {
				return groupCategory.map((domain) => {
					return domain.URL
				})
			})

			console.log('>>> Executando etapa para: ', allCompetitors[0])
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

			// FUTURE: remove comments when finish competitors logic
			/* get SEMrush domainVsDomains results */
			// let rawDomainsComparison = await domainVsDomains({
			// 	limitRows: 1000,
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
			allCompetitors[0].map((domain) => {colParser[domain] = 'number'})
			convertedDomainsComparison = []
			rawDomainsComparison = rawDomainsComparison.map( async rowGroup => {
				let rowGroupJson = await convertResultToJson(rowGroup, colParser)
				return convertedDomainsComparison.push(rowGroupJson)
			})
			rawDomainsComparison = await Promise.all(rawDomainsComparison)
			convertedDomainsComparison = convertedDomainsComparison.flat()

			/* Finds which competitor has the best position */
			let onlyPositionOfInterest = await defineMainAndSecondaryPosition(convertedDomainsComparison, allDomains, mainDomain)
			
			/* Group keywords by competitor and remove those referring to the main domain  */
			let keywordsGrouppedByCompetitor = await groupKeywordsByCompetitor(onlyPositionOfInterest, allDomains)
			keywordsGrouppedByCompetitor = await keywordsGrouppedByCompetitor.filter((group) => Object.keys(group)[0] !== mainDomain[0])

			// FUTURE: remove comments when finish competitors logic
			/* only to use on recursive function */
			// let keywordsUngroupped = []
			// await keywordsGrouppedByCompetitor.map((group) => {
			// 		let groupKeywords = group[Object.keys(group)[0]]
			// 		groupKeywords.map((keyword) => {
			// 				keywordsUngroupped.push(keyword)
			// 	})
			// })			
			// /* get SEMrush organicResults results */
			// let organicResultsByKeyword = await queueOrganicResultsByKeyword(keywordsUngroupped, [])

			/* Convert organicResultsByKeyword to a JSON */
			let convertedOrganicResultsByKeyword = organicResultsByKeyword.map(async (row) => {
				let results = await convertResultToJson(row.results, null)
				return { keyword: row.keyword, competitorPosition: row.competitorPosition, results: results }
			})
			convertedOrganicResultsByKeyword = await Promise.all(convertedOrganicResultsByKeyword)

			/* Define URL Title  and join its value to Organic Results*/ 
			let organicResultsWithTitle = await getURlTitle(convertedOrganicResultsByKeyword, allCompetitorsDetails.specialTitleTreatment)
		
			/* Join values of keyword, competitor and organic search */ 
			let keywordAndCompetitorInfos = await joinKeywordAndCompetitorInfos(keywordsGrouppedByCompetitor, organicResultsWithTitle)

			/* Choose keywords based on title limit */ 
			let choosenKeywords = await chooseKeywordsByTitleLimit(keywordAndCompetitorInfos)

			let savedDocuments = await saveOrganicResults(choosenKeywords)
			keywordsGroupped.push(savedDocuments)
			allCompetitorsByGroup.splice(0, 1)
			return await searchKeywordsListByCompetitorGroup(allCompetitorsByGroup, keywordsGroupped)
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

async function defineMainAndSecondaryPosition(convertedDomainsComparison, allDomains, mainDomain){
	try {
		let onlyPositionOfInterest = await convertedDomainsComparison.reduce(function (accumulator, row, array) {
			let onlyDomainsPosition = []
			row['secondaryCompetitors'] = []
			if(row['Search Volume'] >= 500) {
				allDomains.map((domain) => {
					return onlyDomainsPosition.push(row[domain])
				})
				let min = Math.min(...onlyDomainsPosition)
				let rowKeys = Object.keys(row)
				rowKeys.map((key) => {
					if (allDomains.includes(key)) {
						if (row[key] !== min) {
							if (key == [mainDomain]) {
								row['nznPosition'] = row[key]
							} 
							else if(row[key] <= limitCompetitorPosition) {
								row.secondaryCompetitors.push({competitor: key, competitorPosition:row[key]})
							}
							delete row[key]
						}
					}
				})
				if(row.secondaryCompetitors.length==0) delete row.secondaryCompetitors
				accumulator.push(row)
			} 
			return accumulator
		}, [])
		// onlyPositionOfInterest = Boolean(...onlyPositionOfInterest)
		return onlyPositionOfInterest
	} catch (error) {
		throw error
	}
}

async function groupKeywordsByCompetitor(onlyPositionOfInterest, allDomains){
	try {
		let keywordsGroupped = await onlyPositionOfInterest.reduce((accumulator, row) => {
			let keys = Object.keys(row)
			const competitorKey = keys.filter((a) => allDomains.includes(a))[0]
			row['competitorPosition'] = row[competitorKey]
			delete row[competitorKey]

			var indexOfCompetitor = accumulator.findIndex((i) => Object.keys(i)[0] === competitorKey)

			if (indexOfCompetitor === -1) {
				accumulator.push({ [competitorKey]: [row] })
			} else {
				accumulator[indexOfCompetitor][competitorKey].push(row)
			}
			return accumulator
		}, [])

		return keywordsGroupped

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
			let position = keywordsUngroupped[0].competitorPosition
			keywordsOrganicResults.push({ keyword: keyword, competitorPosition: position, results: x })
			keywordsUngroupped.splice(0, 1)
			return await queueOrganicResultsByKeyword(keywordsUngroupped, keywordsOrganicResults)
		} else {
			return keywordsOrganicResults
		}
	} catch (error) {
		throw error
	}
}

async function getURlTitle(organicResults) {
	try {
		organicResults.map((row, index) => {
			row.results.map( (result, indexResult) =>{
				let url = result.Url.split('/')
				url = url.filter((item) => item)
				let splittedTitle = url[url.length - 1].split('-')
				let title = ''
				splittedTitle.map((word) => {
					title = title + ` ${word}`
				})
				organicResults[index].results[indexResult]['title'] = title.trim()
				organicResults[index].results[indexResult]['titleLength'] = splittedTitle.length
			})
			return
		})

		return organicResults
	} catch (error) {
		throw error
	}
}

async function joinKeywordAndCompetitorInfos(keywordsGrouppedByCompetitor, organicResultsWithTitle) {
	try {
		let keywordAndCompetitorInfos = await keywordsGrouppedByCompetitor.map(async (item) => {
			let competitor = Object.keys(item)[0]
			let keywords = Object.values(item)[0]
			let keywordsMap = await keywords.map(async (keyword, index) => {
				let keywordInfo = organicResultsWithTitle.filter((kwInfo) => kwInfo.keyword == keyword.Keyword)

				item[competitor][index]['competitorInfo'] = keywordInfo[0].results[keyword.competitorPosition-1]
				item[competitor][index]['ctr'] = await defineCtrValue(keywordInfo[0].competitorPosition)

				if(keyword.secondaryCompetitors) {
					keyword.secondaryCompetitors.map( (secondary, indexSecondary) =>{
						console.log(keywordInfo)
						item[competitor][index].secondaryCompetitors[indexSecondary]['competitorInfo'] = keywordInfo[0].results[secondary.competitorPosition-1]
					})
				}
				return item
			})
			keywordsMap = await Promise.all(keywordsMap)
			return item
		})
		keywordAndCompetitorInfos = await Promise.all(keywordAndCompetitorInfos)
		return keywordAndCompetitorInfos
	} catch (error) {
		throw error
	}
}

async function chooseKeywordsByTitleLimit(keywordAndCompetitorInfos){
	try {
		let x = []
		keywordAndCompetitorInfos.map( (kwInfo, index) =>{
			let competitor = Object.keys(kwInfo)[0]
			let keywords = Object.values(kwInfo)[0]
			keywords = keywords.reduce( (accumulator, keyword) =>{
				let titleLength = keyword.competitorInfo.titleLength
				if( titleLength >= 4 ) accumulator.push(keyword)
				return accumulator
			}, [])
			x.push({[competitor]:keywords})
			// return keywordAndCompetitorInfos
		})
		
		return x
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
				return 13.60
		}
	} catch (error) {
		throw error
	}
}
async function saveOrganicResults(organicResults) {
	try {

		let documentsToSave = []

		organicResults.map(async (item) => {
			let competitor = Object.keys(item)[0]
			let keywordsValue = Object.values(item)[0]

			keywordsValue.map(keywordObject => {
				keywordObject['competitor'] = competitor 
				documentsToSave.push(keywordObject)
			});
		})

		if(documentsToSave.length > 0) {
			let saveResult = await saveMultiple({
				collection:semRushCollection,
				documents: documentsToSave
			})
			console.log('>>> Finalizando etapa')
			console.log('>>> Resultados')
			console.log(organicResults)
			return saveResult
		}
		else return 

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
