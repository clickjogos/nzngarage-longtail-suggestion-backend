const csvtojson = require('csvtojson')

const { domainVsDomains, organicResults } = require('../connectors/semRushConnector')
const { save, findAll } = require('../connectors/mongodbConnector')

const { getCompetitorsList } = require('./competitorsController')

const semRushCollection = process.env.SEMRUSH_COLLECTION

const rawDomainsComparison = "Keyword;tecmundo.com.br;canaltech.com.br;tecnoblog.net;olhardigital.com.br;Number of Results;Search Volume\r\ninstagram;22;4;13;34;93;24900000\r\nairbnb;50;3;15;27;225000000;1830000\r\nfilmes;3;4;53;9;667000000;1500000\r\ninstagram entrar;48;4;5;88;740000000;1000000\r\na50;20;4;14;55;98400000;823000\r\ninstagran;15;4;19;38;25270000000;823000\r\npaypal;9;4;10;7;1350000000;823000\r\npiratebay;6;2;1;3;17400000;823000\r\ntelegram web;33;3;8;56;757000000;673000\r\nredmi note 7;20;3;29;48;99;550000\r\n"
async function searchKeywordsList() {
	try {

        /* get list of competitors */ 
		// let allCompetitors = await (await getCompetitorsList()).competitorsListArray
		// allCompetitors = allCompetitors.map((domain) => {
		// 	return domain.URL
        // })
        let allCompetitors = ['canaltech.com.br', 'tecnoblog.net','olhardigital.com.br'] // only for tests while competitors logic isnt finish
		const mainDomain = ['tecmundo.com.br']
        const allDomains = [...mainDomain, ...allCompetitors]
        const numberOfDomains = allDomains.length
        const limitCompetitorPosition = 4

        /* create objects to use as SEMrush parameters */ 
		let queryDomains = ''
		let exportColumns = 'Ph,Nr,Nq'
		let displayFilter = ''
		await allDomains.map((domain, index) => { 
            if(index < (numberOfDomains-1)) queryDomains = queryDomains + `*|or|${domain}|`
            else queryDomains = queryDomains + `*|or|${domain}`

            exportColumns = exportColumns + `,P${index}`

            if( index !== 0 ){
                if( index < (numberOfDomains-1) ) displayFilter = displayFilter + `-|P${index}|Gt|${limitCompetitorPosition}|+|`
                else displayFilter = displayFilter + `-|P${index}|Gt|${limitCompetitorPosition}`
            }
        })

        /* get SEMrush domainVsDomains results */ 
		// let rawDomainsComparison = await domainVsDomains({
		// 	displayLimit: 10,
		// 	type: 'domain_domains',
		// 	database: 'br',
        // 	//domains: `*|or|tecmundo.com.br|*|or|canaltech.com.br|*|or|tecnoblog.net|*|or|olhardigital.com.br`,
        //  domains: queryDomains,
        // 	//exportColumns: 'Ph,P0,P1,P2,P3,P4,Nr,Nq',
        //  exportColumns: exportColumns,
        // 	//displayFilter: '-|P1|Gt|4|+|-|P2|Gt|4|+|-|P3|Gt|4',
        //  displayFilter: displayFilter
		// })

        let colParser = { 
            'Number of Results': 'number',
            'Search Volume': 'number',
            [mainDomain]: 'number'
        }
        allCompetitors.map( domain =>{
            colParser[domain] = 'number'
        })
		const convertedDomainsComparison = await csvtojson({
			delimiter: [';'],
			alwaysSplitAtEOL: true,
			trim: true,
			flatKeys: true,
			colParser: colParser
		}).fromString(rawDomainsComparison)

		await convertedDomainsComparison.reduce(function (accumulator, row, array) {
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

		let keywordsGrouppedByCompetitor = await convertedDomainsComparison.reduce((accumulator, row) => {
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

		keywordsGrouppedByCompetitor.map(async (item) => {
			let competitor = Object.keys(item)[0]
			let keywords = Object.values(item)
			let objectToSave = {
				competitor: competitor,
				keywords: keywords,
			}

			var savedDocument = await save({
				collection: semRushCollection,
				document: objectToSave,
			})
			console.log()
		})

		return keywordsGrouppedByCompetitor
	} catch (error) {
		throw error
	}
}

// searchKeywordsList()

module.exports = {
	searchKeywordsList
}
