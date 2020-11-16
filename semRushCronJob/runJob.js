require('dotenv').config()

const csvtojson = require('csvtojson')

const { domainVsDomains, organicResults } = require('./connectors/semRushConnector')
const { save, findAll, deleteMany } = require('./connectors/mongodbConnector')

const semRushCollection = 'semrush-results'

// const rawDomainsComparison = "Keyword;Number of Results;Search Volume;tecmundo.com.br;canaltech.com.br;techtudo.com.br;tecnoblog.net;olhardigital.com.br\r\nmsn;306000000;4090000;7;4;10;30;13\r\nairbnb;219000000;1830000;50;2;19;13;28\r\ninstagram entrar;796000000;1000000;63;3;6;4;48\r\na50;90300000;823000;26;4;10;18;55\r\npaypal;1510000000;823000;11;3;2;9;7\r\npiratebay;5420000;823000;6;2;14;1;3\r\niphone 6s;89;673000;16;3;7;17;19\r\ntelegram web;639000000;673000;18;3;13;9;85\r\na70;61600000;450000;27;3;10;15;59\r\nmoto g8 power;95;450000;45;4;13;17;53\r\n"

// const organicResultsByKeyword = [
// 	{
// 	  keyword: "msn",
// 	  position: 4,
// 	  results: "Domain;Url;SERP Features\r\nmsn.com;https://www.msn.com/pt-br;1,4,6\r\nwikipedia.org;https://pt.wikipedia.org/wiki/MSN;1,4\r\nwikipedia.org;https://pt.wikipedia.org/wiki/MSN_Messenger;1,4\r\ncanaltech.com.br;https://canaltech.com.br/empresa/msn/;1,4",
// 	},
// 	{
// 	  keyword: "airbnb",
// 	  position: 2,
// 	  results: "Domain;Url;SERP Features\r\nairbnb.com.br;https://www.airbnb.com.br/;1,4,5,6\r\ncanaltech.com.br;https://canaltech.com.br/curiosidades/Airbnb-Plataforma-de-de-hospedagens-traz-opcoes-para-todo-o-tipo-de-turista/;1,4,5",
// 	},
// 	{
// 	  keyword: "instagram entrar",
// 	  position: 3,
// 	  results: "Domain;Url;SERP Features\r\ninstagram.com;https://www.instagram.com/?hl=pt-br;6\r\nfacebook.com;https://pt-br.facebook.com/instagram/;7\r\ncanaltech.com.br;https://canaltech.com.br/android/acesse-o-seu-instagram-a-partir-do-facebook-em-smartphones-android/;",
// 	},
// 	{
// 	  keyword: "a50",
// 	  position: 4,
// 	  results: "Domain;Url;SERP Features\r\ntudocelular.com;https://www.tudocelular.com/Samsung/fichas-tecnicas/n5315/Samsung-Galaxy-A50.html;5,6\r\nsamsung.com;https://www.samsung.com/br/smartphones/galaxy-a50-a505/SM-A505GZBSZTO/;5\r\nmagazineluiza.com.br;https://www.magazineluiza.com.br/galaxy-a50/celulares-e-smartphones/s/te/sga5/;5,6,7\r\ncanaltech.com.br;https://canaltech.com.br/produto/samsung/galaxy-a50/;5",
// 	},
// 	{
// 	  keyword: "iphone 6s",
// 	  position: 3,
// 	  results: "Domain;Url;SERP Features\r\ntudocelular.com;https://www.tudocelular.com/Apple/fichas-tecnicas/n2968/Apple-iPhone-6S.html;5,6\r\namericanas.com.br;https://www.americanas.com.br/categoria/celulares-e-smartphones/smartphone/iphone/iphone-6s;5\r\ncanaltech.com.br;https://canaltech.com.br/produto/apple/iphone-6s/;5",
// 	},
// 	{
// 	  keyword: "telegram web",
// 	  position: 3,
// 	  results: "Domain;Url;SERP Features\r\ntelegram.org;https://web.telegram.org/;1,6\r\ncelulardireto.com.br;https://www.celulardireto.com.br/telegram-web-como-utilizar-o-app-no-computador/;1\r\ncanaltech.com.br;https://canaltech.com.br/apps/whatsapp-web-telegram-web-comparativo/;1",
// 	},
// 	{
// 	  keyword: "a70",
// 	  position: 3,
// 	  results: "Domain;Url;SERP Features\r\ntudocelular.com;https://www.tudocelular.com/Samsung/fichas-tecnicas/n5395/Samsung-Galaxy-A70.html;5,6\r\nsamsung.com;https://www.samsung.com/br/smartphones/galaxy-a70-a705/SM-A705MZKJZTO/;5\r\ncanaltech.com.br;https://canaltech.com.br/produto/samsung/galaxy-a70/;5",
// 	},
// 	{
// 	  keyword: "moto g8 power",
// 	  position: 4,
// 	  results: "Domain;Url;SERP Features\r\ntudocelular.com;https://www.tudocelular.com/Motorola/fichas-tecnicas/n6123/Motorola-Moto-G8-Power.html;1,5,6\r\nzoom.com.br;https://www.zoom.com.br/celular/smartphone-motorola-moto-g-g8-power-xt2041-1-64gb;1,5\r\nmotorola.com.br;https://www.motorola.com.br/smartphone-moto-g8-power/p;1,5\r\ncanaltech.com.br;https://canaltech.com.br/produto/motorola/moto-g8-power/;1,5",
// 	},
// 	{
// 	  keyword: "paypal",
// 	  position: 2,
// 	  results: "Domain;Url;SERP Features\r\npaypal.com;https://www.paypal.com/br/home;1,4,6\r\ntechtudo.com.br;http://www.techtudo.com.br/noticias/noticia/2014/07/o-que-e-e-como-funciona-o-paypal.html;1,4",
// 	},
// 	{
// 	  keyword: "piratebay",
// 	  position: 1,
// 	  results: "Domain;Url;SERP Features\r\ntecnoblog.net;https://tecnoblog.net/10420/alternativas-ao-pirate-bay/;1",
// 	},
//   ]

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
		if(allCompetitorsByGroup.length > 0 ) {
			let allCompetitors = Object.values(allCompetitorsByGroup[0]).map((groupCategory) => {
				return groupCategory.map( domain =>{
					return domain.URL

				} )
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
			// 	displayLimit: 10,
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
			collection: 'competitors'
		})
		
		competitors.map((competitor) => { delete competitor._id })

		let competitorsByGroup = competitors.reduce(( accumulator, item ) =>{ 
			item.category.map( category =>{
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

async function clearCollection(){
	try {
		await deleteMany({
			collection: semRushCollection,
			document: {},
		})
	} catch (error) {
		throw error
	}
}
async function saveOrganicResults(organicResults) {
	try {

		let savedDocuments = await organicResults.map(async (item) => {
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
		await Promise.all(savedDocuments)
		console.log('>>> Finalizando etapa')
		console.log('>>> Resultados')
		console.log(organicResults)

		return savedDocuments
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
