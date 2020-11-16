const mongodbConnector = require("../connectors/mongodbConnector.js");
const _ = require("lodash");
const { options } = require("../routes/keyWordsRoutes.js");
const {searchKeywordsListByCompetitor} = require ("./semRushController")

//route to get the key words list from database

async function getKeyWords (params) {
  try {
    let competitors = await mongodbConnector.list ({
      collection: "semrush-results",
      query: { 
              "competitor": 
                params.domain
            }
            
    })
    var keyWords = { 
      keyWordsArray: []
    }
    if (competitors) { 
    competitors.list.map((keywords)=>{
      // delete competitor._id
      keyWords.keyWordsArray.push(keywords)
    })
    return keyWords}
    else { 
      // keyword search in case we need to return a non-listed competitor
      // let semRushResults = await searchKeywordsListByCompetitor(params)
      // keyWords.keyWordsArray.push(semRushResults)
      return keyWords
    } 
  } 
  catch (error) {
    console.log(error)
    throw new Error (err)
  }
} 

module.exports = {
  getKeyWords
}
