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

async function getSemRushResponse(){ 
    try {
   
        
        
        let options = {
            method: 'GET',
            headers: HEADERS,
            url: BASE_URL ,            
            params: {
                key: IAM_APIKEY,
                display_limit: 1,
                type: "domain_domains",
                database: "br",
                domains:"*|or|canaltech.com.br|*|or|tecmundo.com.br",
                export_columns: 'Ph,P0,P1,P2,P3,P4,Nr,Cp,Nq,Kd,Co,Td',

            }
        }
        
        let response_scoring = await axios(options)        
        return response_scoring.data
        
    } catch (error) {
         // "Failed to recieve scoring model" 
        throw(error.message)
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

        options.params['domains'] = payload.domains
        options.params['display_limit'] = payload.displayLimit
        options.params['export_columns'] = payload.exportColumns

        let semRushResponse = await axios(options)        
        return semRushResponse.data

    } catch (error) {
        throw new Error(error.message)
    }
}