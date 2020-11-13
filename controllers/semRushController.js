const csvtojson = require('csvtojson')

const { domainVsDomains, organicResults } = require('../connectors/semRushConnector')
const { save, findAll, deleteMany } = require('../connectors/mongodbConnector')

const { getCompetitorsList } = require('./competitorsController')

const semRushCollection = 'semrush-results'

const rawDomainsComparison = "Keyword;Number of Results;Search Volume;tecmundo.com.br;omelete.com.br\r\nfilmes;715000000;1500000;1;3\r\nbaby shark;289000000;1220000;48;2\r\ncoringa;15200000;1000000;10;4\r\nhomem aranha;43300000;673000;8;2\r\nfilmes 2019;295000000;368000;1;3\r\nstar wars;950000000;368000;26;3\r\nbatman;507000000;301000;69;3\r\nfilmes de terror;66200000;301000;17;2\r\noscars 2020;74800000;301000;68;3\r\narlequina;7480000;246000;68;4\r\n"

const organicResultsByKeyword = [
	{
	  keyword: "filmes",
	  position: 1,
	  results: "Domain;Url;SERP Features\r\ntecmundo.com.br;https://www.tecmundo.com.br/filmes;4,5",
	},
	{
	  keyword: "filmes 2019",
	  position: 1,
	  results: "Domain;Url;SERP Features\r\ntecmundo.com.br;https://www.tecmundo.com.br/cultura-geek/136761-42-filmes-imperdiveis-estreiam-2019-cinemas.htm;5",
	},
	{
	  keyword: "baby shark",
	  position: 2,
	  results: "Domain;Url;SERP Features\r\nyoutube.com;https://www.youtube.com/watch/XqZsoesa55w;1,4,5\r\nomelete.com.br;https://www.omelete.com.br/musica/baby-shark-video-mais-visto-no-youtube;1,4,5",
	},
	{
	  keyword: "coringa",
	  position: 4,
	  results: "Domain;Url;SERP Features\r\nadorocinema.com;http://www.adorocinema.com/filmes/filme-258374/;1,4,7\r\nwikipedia.org;https://pt.wikipedia.org/wiki/Joker_(filme);1,4,6\r\nwikipedia.org;https://pt.wikipedia.org/wiki/Joker_(DC_Comics);1,4\r\nomelete.com.br;https://www.omelete.com.br/oscar/coringa-filme/coringa-tudo-sobre;1,4",
	},
	{
	  keyword: "homem aranha",
	  position: 2,
	  results: "Domain;Url;SERP Features\r\nwikipedia.org;https://pt.wikipedia.org/wiki/Homem-Aranha;1,4\r\nomelete.com.br;https://www.omelete.com.br/homem-aranha;1,4",
	},
	{
	  keyword: "star wars",
	  position: 3,
	  results: "Domain;Url;SERP Features\r\nwikipedia.org;https://pt.wikipedia.org/wiki/Star_Wars;1,4,6\r\nfandom.com;https://starwars.fandom.com/pt/wiki/Star_Wars;1,4\r\nomelete.com.br;https://www.omelete.com.br/star-wars;1,4",
	},
	{
	  keyword: "batman",
	  position: 3,
	  results: "Domain;Url;SERP Features\r\nwikipedia.org;https://pt.wikipedia.org/wiki/Batman;1,4,6\r\nuol.com.br;https://observatoriodocinema.uol.com.br/filmes/2020/11/ator-de-homem-aranha-vira-coringa-do-batman-de-robert-pattinson-em-imagem-veja;1,4\r\nomelete.com.br;https://www.omelete.com.br/batman;1,4",
	},
	{
	  keyword: "filmes de terror",
	  position: 2,
	  results: "Domain;Url;SERP Features\r\nmatildefilmes.com.br;http://www.matildefilmes.com.br/especial-halloween-filmes-de-terror-mais-assustadores-de-todos-os-tempos/;4,5\r\nomelete.com.br;https://www.omelete.com.br/terror/melhores-filmes-series/31-filmes-terror-halloween-sexta-feira-13;4,5",
	},
	{
	  keyword: "oscars 2020",
	  position: 3,
	  results: "Domain;Url;SERP Features\r\nwikipedia.org;https://pt.wikipedia.org/wiki/Oscar_2020;1,5,6\r\nwikipedia.org;https://en.wikipedia.org/wiki/92nd_Academy_Awards;1,5\r\nomelete.com.br;https://www.omelete.com.br/oscar/oscar-2020-indicados;1,5",
	},
	{
	  keyword: "arlequina",
	  position: 4,
	  results: "Domain;Url;SERP Features\r\nwikipedia.org;https://pt.wikipedia.org/wiki/Arlequina;1,4,6\r\nyoutube.com;https://www.youtube.com/watch?v=aRCW9uvl_qs&list=PLzg0p7MEDWxgyKrONZZm3K_VsoJDmEqhR&index=9;1,4,9\r\npinterest.com;https://br.pinterest.com/alissonbarreto2/imagens-da-arlequina/;1,4\r\nomelete.com.br;https://www.omelete.com.br/ccxp/esquadrao-suicida-por-que-todos-amam-arlequina;1,4",
	},
  ]

async function searchKeywordsListByCompetitor(payload) {
	try {
		
		let allCompetitors = [payload.domain] 
		const mainDomain = ['tecmundo.com.br']
		const allDomains = [...mainDomain, ...allCompetitors]
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
		// 	displayLimit: 10,
		// 	type: 'domain_domains',
		// 	database: 'br',
		// 	//domains: `*|or|tecmundo.com.br|*|or|canaltech.com.br|*|or|tecnoblog.net|*|or|olhardigital.com.br`,
		// 	domains: queryDomains,
		// 	//exportColumns: 'Ph,P0,P1,P2,P3,P4,Nr,Nq',
		// 	exportColumns: exportColumns,
		// 	//displayFilter: '-|P1|Gt|4|+|-|P2|Gt|4|+|-|P3|Gt|4',
		// 	displayFilter: displayFilter,
		// })

		let colParser = {
			'Number of Results': 'number',
			'Search Volume': 'number',
			[mainDomain]: 'number',
		}
		allCompetitors.map((domain) => {
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
					if (row[key] !== min) delete row[key]
				}
			})

			accumulator.push(row)
			return accumulator
		}, [])

		let keywordsGrouppedByCompetitor = await onlyPositionOfInterst.reduce((accumulator, row) => {
			let keys = Object.keys(row)
			const competitorKey = keys.filter((a) => allDomains.includes(a))[0]
			row['position'] = row[competitorKey]
			delete row[competitorKey]

			var indexOfCompetitor = accumulator.findIndex((i) => Object.keys(i)[0] === competitorKey)

			if (indexOfCompetitor === -1) {
				accumulator.push({ [competitorKey]: [row] })
			} else {
				accumulator[indexOfCompetitor][competitorKey].push(row)
			}

			return accumulator
		}, [])

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

			return { keyword: row.keyword, position: row.position, result: results[row.position - 1] }
		})
		convertedOrganicResultsByKeyword = await Promise.all(convertedOrganicResultsByKeyword)

		let organicResultsWithTitle = await getURlTitle(convertedOrganicResultsByKeyword)

		let keywordAndCompetitorInfos = keywordsGrouppedByCompetitor.map((item) => {
			let competitor = Object.keys(item)[0]
			let keywords = Object.values(item)[0]
			keywords.map((keyword, index) => {
				let x = organicResultsWithTitle.filter((kwInfo) => kwInfo.keyword == keyword.Keyword)
				item[competitor][index]['competitorInfo'] = x[0].result
			})
			return item
		})
		// let savedDocuments = await saveOrganicResults(keywordAndCompetitorInfos)
		let competitorKeywordsList = await keywordAndCompetitorInfos.filter( competitor => 
			Object.keys(competitor)[0] === allCompetitors[0]
		)
		let keywordListResponse = {
			competitor: Object.keys(competitorKeywordsList[0])[0],
			keywords: Object.values(competitorKeywordsList[0])[0]
		}
		return keywordListResponse
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

async function getOrganicResultsByKeyword(keywordsUngroupped, keywordsOrganicResults) {
	try {
		if (keywordsUngroupped.length > 0) {
			let x = await organicResults({
				phrase: keywordsUngroupped[0].Keyword,
				displayLimit: keywordsUngroupped[0].position,
				exportColumns: 'Dn,Ur,Fk',
			})
			let keyword = keywordsUngroupped[0].Keyword
			let position = keywordsUngroupped[0].position
			keywordsOrganicResults.push({ keyword: keyword, position: position, results: x })
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

async function saveOrganicResults(organicResults) {
	try {

		let savedDocuments = organicResults.map(async (item) => {
			let competitor = Object.keys(item)[0]
			let keywords = Object.values(item)[0]
			let objectToSave = {
				competitor: competitor,
				keywords: keywords,
			}
			var savedDocument = await save({
				collection: semRushCollection,
				document: objectToSave,
            })			
            return savedDocument
        })
        
        return savedDocuments
	} catch (error) {
		throw error
	}
}

module.exports = {
	searchKeywordsListByCompetitor
}
