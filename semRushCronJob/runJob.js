require('dotenv').config()

const csvtojson = require('csvtojson')

// const { domainVsDomains, organicResults } = require('./connectors/semRushConnector')
const { save, saveMultiple, updateOne, findAll, deleteMany } = require('./connectors/mongodbConnector')

const semRushCollection = 'semrush-results'

/* only for tests */
// let mockConfigJson = require('./mockConfig.json')
// const rawDomainsComparison = mockConfigJson.rawDomainsComparison
// const organicResultsByKeyword = mockConfigJson.organicResultsByKeyword

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
			let allCompetitors = Object.values(allCompetitorsByGroup[0]).map((groupCategory) => {
				return groupCategory.map((domain) => {
					return domain.URL
				})
			})

			console.log('>>> Executando etapa para: ', allCompetitors[0])
			const mainDomain = ['tecmundo.com.br']
			const allDomains = [...mainDomain, ...allCompetitors[0]]
			const numberOfDomains = allDomains.length
			const limitCompetitorPosition = 4

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
			// 	displayLimit: 1000,
			// 	type: 'domain_domains',
			// 	database: 'br',
			// 	domains: queryDomains,
			// 	exportColumns: exportColumns,
			// 	displayFilter: displayFilter,
			// })

			let colParser = {
				'Number of Results': 'number',
				'Search Volume': 'number',
				[mainDomain]: 'number',
			}
			allCompetitors[0].map((domain) => {
				colParser[domain] = 'number'
			})
			const convertedDomainsComparison = await convertResultToJson(rawDomainsComparison, colParser)

			let onlyPositionOfInterst = await convertedDomainsComparison.reduce(function (accumulator, row, array) {
				let onlyDomainsPosition = []
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
							delete row[key]
						}
					}
				})

				accumulator.push(row)
				return accumulator
			}, [])

			let keywordsGrouppedByCompetitor = await onlyPositionOfInterst.reduce((accumulator, row) => {
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
			keywordsGrouppedByCompetitor = await keywordsGrouppedByCompetitor.filter((group) => Object.keys(group)[0] !== mainDomain[0])
			// FUTURE: remove comments when finish competitors logic
			/* get SEMrush organicResults results */
			/* only to use on recursive function */
			// let keywordsUngroupped = []
			// await keywordsGrouppedByCompetitor.map((group) => {
			// 	let groupKeywords = group[Object.keys(group)[0]]
			// 	groupKeywords.map((keyword) => {
			// 		keywordsUngroupped.push(keyword)
			// 	})
			// })
			// let organicResultsByKeyword = await getOrganicResultsByKeyword(keywordsUngroupped, [])

			let convertedOrganicResultsByKeyword = organicResultsByKeyword.map(async (row) => {
				let results = await convertResultToJson(row.results, null)

				return { keyword: row.keyword, competitorPosition: row.competitorPosition, result: results[row.competitorPosition - 1] }
			})
			convertedOrganicResultsByKeyword = await Promise.all(convertedOrganicResultsByKeyword)

			let organicResultsWithTitle = await getURlTitle(convertedOrganicResultsByKeyword)

			let keywordAndCompetitorInfos = await keywordsGrouppedByCompetitor.map(async (item) => {
				let competitor = Object.keys(item)[0]
				let keywords = Object.values(item)[0]
				keywords.map(async (keyword, index) => {
					let keywordInfo = organicResultsWithTitle.filter((kwInfo) => kwInfo.keyword == keyword.Keyword)

					item[competitor][index]['competitorInfo'] = keywordInfo[0].result
					item[competitor][index]['ctr'] = await defineCtrValue(keywordInfo[0].competitorPosition)
				})
				return item
			})
			keywordAndCompetitorInfos = await Promise.all(keywordAndCompetitorInfos)

			let savedDocuments = await saveOrganicResults(keywordAndCompetitorInfos)
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

async function getOrganicResultsByKeyword(keywordsUngroupped, keywordsOrganicResults) {
	try {
		if (keywordsUngroupped.length > 0) {
			let x = await organicResults({
				phrase: keywordsUngroupped[0].Keyword,
				displayLimit: keywordsUngroupped[0].competitorPosition,
				exportColumns: 'Dn,Ur,Fk',
			})
			let keyword = keywordsUngroupped[0].Keyword
			let position = keywordsUngroupped[0].competitorPosition
			keywordsOrganicResults.push({ keyword: keyword, competitorPosition: position, results: x })
			keywordsUngroupped.splice(0, 1)
			return await getOrganicResultsByKeyword(keywordsUngroupped, keywordsOrganicResults)
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
			let url = row.result.Url.split('/')
			url = url.filter((item) => item)
			let splittedTitle = url[url.length - 1].split('-')
			let title = ''
			splittedTitle.map((word) => {
				title = title + ` ${word}`
			})
			organicResults[index].result['title'] = title.trim()
			return
		})

		return organicResults
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

		let saveResult = await saveMultiple({
			collection:semRushCollection,
			documents: documentsToSave
		})
		console.log('>>> Finalizando etapa')
		console.log('>>> Resultados')
		console.log(organicResults)

		return saveResult
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
