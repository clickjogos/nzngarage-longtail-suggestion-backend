const axios = require('axios')

const IAM_APIKEY = process.env.SEMRUSH_APIKEY
const BASE_URL = "https://api.semrush.com/api-analytics/"

const HEADERS = {
    'Content-Type': 'application/json'
}

let options = {
    method: 'GET',
    headers: HEADERS,
    url: BASE_URL,
    params: {
        key: IAM_APIKEY,      
        display_limit: 1,
        database: "br",
    }
}

exports.domainVsDomains = async (payload) =>{
    try {
        options.params['type'] = 'domain_domains'

        options.params['domains'] = payload.domains
        options.params['display_limit'] = payload.displayLimit
        options.params['export_columns'] = payload.exportColumns
        options.params['display_filter'] = payload.displayFilter

        let semRushResponse = await axios(options)     
        console.log(semRushResponse.data)   
        return semRushResponse.data

    } catch (error) {
        throw new Error(error.message)
    }
}

exports.organicResults = async (payload) =>{
    try {
        options.params['type'] = 'phrase_organic'

        options.params['phrase'] = payload.phrase
        options.params['display_limit'] = payload.displayLimit
        options.params['export_columns'] = payload.exportColumns

        let semRushResponse = await axios(options)     
        console.log(semRushResponse.data)    
        return semRushResponse.data

    } catch (error) {
        throw new Error(error.message)
    }
}