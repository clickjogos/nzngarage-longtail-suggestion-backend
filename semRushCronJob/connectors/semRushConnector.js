const axios = require('axios')

const IAM_APIKEY = process.env.SEMRUSH_APIKEY
const BASE_URL = 'https://api.semrush.com/api-analytics/'

const HEADERS = {
	'Content-Type': 'application/json',
}

let options = {
	method: 'GET',
	headers: HEADERS,
	url: BASE_URL,
	params: {
		key: IAM_APIKEY,
		display_limit: 1,
		database: 'br',
	},
}

exports.domainVsDomains = async (payload) => {
	try {
		options.params['type'] = 'domain_domains'

		options.params['domains'] = payload.domains
		options.params['export_columns'] = payload.exportColumns
		options.params['display_filter'] = payload.displayFilter

		let limitRows = payload.limitRows
		let loop = 2
		let displayLimitArray = Array.from({ length: loop }, (arrayPos, arrayIndex) => {
			let limit = limitRows / loop
			if (arrayIndex == 0) {
				return limit
			} else {
				return limit + (arrayIndex * limit)
			}
        })
        let displayOffset = 0

		let semRushResponseArray = []
		await queueDomainVsDomain(loop, displayLimitArray, displayOffset, options, semRushResponseArray)

		return semRushResponseArray
	} catch (error) {
		throw new Error(error.message)
	}
}

async function queueDomainVsDomain(loop, displayLimitArray, displayOffset, options, semRushResponseArray) {
	try {
		if (loop > 0) {
            //comeco
            let displayLimit = displayLimitArray[0]
            options.params['display_limit'] = displayLimit
            options.params['display_offset'] = displayOffset
            
            
            let semRushResponse = await axios(options)

            semRushResponseArray.push(semRushResponse.data)
            //fim
            displayOffset = displayLimit
            displayLimitArray.splice(0,1)
            loop--
            return await queueDomainVsDomain(loop, displayLimitArray, displayOffset, options, semRushResponseArray)
		} else {
			return semRushResponseArray
		}
	} catch (error) {
		throw new Error(error.message)
	}
}

exports.organicResults = async (payload) => {
	try {
		options.params['type'] = 'phrase_organic'

		options.params['phrase'] = payload.phrase
		options.params['display_limit'] = payload.displayLimit
		options.params['export_columns'] = payload.exportColumns

		let semRushResponse = await axios(options)
		console.log(`results for ${payload.phrase}`)
		return semRushResponse.data
	} catch (error) {
		throw new Error(error.message)
	}
}
