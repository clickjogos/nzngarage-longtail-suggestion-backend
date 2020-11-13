require('dotenv').config()

const csvtojson = require('csvtojson')

const { domainVsDomains, organicResults } = require('./connectors/semRushConnector')
const { save, findAll, deleteMany } = require('./connectors/mongodbConnector')

const semRushCollection = 'semrush-results'

const rawDomainsComparison =
	'Keyword;Number of Results;Search Volume;tecmundo.com.br;canaltech.com.br;tecnoblog.net;olhardigital.com.br\r\nairbnb;177000000;1830000;46;2;11;33\r\nsamsung;97;1500000;7;4;27;24\r\ninstagram entrar;552000000;1000000;58;3;4;44\r\na50;102000000;823000;24;4;12;57\r\npaypal;1160000000;823000;30;4;15;7\r\npiratebay;7160000;823000;6;2;1;4\r\ntelegram web;531000000;673000;15;3;8;93\r\nredmi note 7;384000000;550000;22;3;24;56\r\na70;75800000;450000;29;4;25;61\r\ngalaxy s10;290000000;450000;43;4;10;46\r\n'

const organicResultsByKeyword = [
	{
		keyword: 'airbnb',
		position: 2,
		results:
			'Domain;Url;SERP Features\r\nairbnb.com.br;https://www.airbnb.com.br/;1,4,5,6\r\ncanaltech.com.br;https://canaltech.com.br/curiosidades/Airbnb-Plataforma-de-de-hospedagens-traz-opcoes-para-todo-o-tipo-de-turista/;1,4,5',
	},
	{
		keyword: 'samsung',
		position: 4,
		results:
			'Domain;Url;SERP Features\r\nsamsung.com;https://www.samsung.com/br/;1,3,4,5,6\r\nsamsung.com.br;https://shop.samsung.com.br/;1,3,4,5\r\nzoom.com.br;https://www.zoom.com.br/celular/samsung;1,3,4,5\r\ncanaltech.com.br;https://canaltech.com.br/empresa/samsung/;1,3,4,5',
	},
	{
		keyword: 'instagram entrar',
		position: 3,
		results:
			'Domain;Url;SERP Features\r\ninstagram.com;https://www.instagram.com/?hl=pt-br;6\r\nfacebook.com;https://pt-br.facebook.com/instagram/;7\r\ncanaltech.com.br;https://canaltech.com.br/android/acesse-o-seu-instagram-a-partir-do-facebook-em-smartphones-android/;',
	},
	{
		keyword: 'a50',
		position: 4,
		results:
			'Domain;Url;SERP Features\r\ntudocelular.com;https://www.tudocelular.com/Samsung/fichas-tecnicas/n5315/Samsung-Galaxy-A50.html;5,6\r\nsamsung.com;https://www.samsung.com/br/smartphones/galaxy-a50-a505/SM-A505GZBSZTO/;5\r\nmagazineluiza.com.br;https://www.magazineluiza.com.br/galaxy-a50/celulares-e-smartphones/s/te/sga5/;5,6,7\r\ncanaltech.com.br;https://canaltech.com.br/produto/samsung/galaxy-a50/;5',
	},
	{
		keyword: 'paypal',
		position: 4,
		results:
			'Domain;Url;SERP Features\r\npaypal.com;https://www.paypal.com/br/home;1,6\r\ntechtudo.com.br;http://www.techtudo.com.br/noticias/noticia/2014/07/o-que-e-e-como-funciona-o-paypal.html;1\r\nenotas.com.br;https://enotas.com.br/blog/paypal-como-funciona/;1\r\ncanaltech.com.br;https://canaltech.com.br/e-commerce/o-que-e-o-paypal-saiba-tudo-sobre-a-plataforma-de-pagamentos-155603/;1',
	},
	{
		keyword: 'telegram web',
		position: 3,
		results:
			'Domain;Url;SERP Features\r\ntelegram.org;https://web.telegram.org/;1,6\r\ncelulardireto.com.br;https://www.celulardireto.com.br/telegram-web-como-utilizar-o-app-no-computador/;1\r\ncanaltech.com.br;https://canaltech.com.br/apps/whatsapp-web-telegram-web-comparativo/;1',
	},
	{
		keyword: 'redmi note 7',
		position: 3,
		results:
			'Domain;Url;SERP Features\r\ntudocelular.com;https://www.tudocelular.com/Redmi/fichas-tecnicas/n5182/Redmi-Note-7.html;5,6\r\namazon.com.br;https://www.amazon.com.br/Smartphone-Xiaomi-Redmi-Note-64GB/dp/B07Q8Y75XH;5,7\r\ncanaltech.com.br;https://canaltech.com.br/produto/xiaomi/redmi-note-7/;5',
	},
	{
		keyword: 'a70',
		position: 4,
		results:
			'Domain;Url;SERP Features\r\ntudocelular.com;https://www.tudocelular.com/Samsung/fichas-tecnicas/n5395/Samsung-Galaxy-A70.html;5,6\r\nsamsung.com;https://www.samsung.com/br/smartphones/galaxy-a70-a705/SM-A705MZKJZTO/;5\r\nmagazineluiza.com.br;https://www.magazineluiza.com.br/galaxy-a70/celulares-e-smartphones/s/te/sga7/;5\r\ncanaltech.com.br;https://canaltech.com.br/produto/samsung/galaxy-a70/;5',
	},
	{
		keyword: 'galaxy s10',
		position: 4,
		results:
			'Domain;Url;SERP Features\r\nsamsung.com;https://www.samsung.com/br/smartphones/galaxy-s10/;1,4,5,6\r\ntudocelular.com;https://www.tudocelular.com/Samsung/fichas-tecnicas/n5101/Samsung-Galaxy-S10.html;1,4,5,6\r\nmagazineluiza.com.br;https://www.magazineluiza.com.br/galaxy-s10/celulares-e-smartphones/s/te/gs10/;1,4,5,6\r\ncanaltech.com.br;https://canaltech.com.br/produto/samsung/galaxy-s10/;1,4,5',
	},
	{
		keyword: 'piratebay',
		position: 1,
		results: 'Domain;Url;SERP Features\r\ntecnoblog.net;https://tecnoblog.net/10420/alternativas-ao-pirate-bay/;1',
	},
]

function searchKeywordsList() {
	return new Promise(async (resolve, reject) => {
		try {
			console.log('>>> Iniciando Job')

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
			// let allCompetitors = ['canaltech.com.br', 'tecnoblog.net', 'olhardigital.com.br'] // only for tests while competitors logic isnt finish
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
			// /* get SEMrush organicResults results */
			// /* only to use on recursive function */
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

async function saveOrganicResults(organicResults) {
	try {
		// await deleteMany({
		// 	collection: semRushCollection,
		// 	document: {},
		// })
		let savedDocuments = organicResults.map(async (item) => {
			let competitor = Object.keys(item)[0]
			let keywords = Object.values(item)[0]
			let objectToSave = {
				competitor: competitor,
				keywords: keywords,
			}
			// var savedDocument = await save({
			// 	collection: semRushCollection,
			// 	document: objectToSave,
			// })
			// return savedDocument
			return objectToSave
		})
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
