const mongodbConnector = require("../connectors/mongodbConnector.js");
const _ = require("lodash");

//route to get the competitors list and also their URL from database

async function getCompetitorsList (params) {
  try { 
    let competitors = await mongodbConnector.list ({
      collection: "competitors",
      query: { 
                  "competitor": {
                    $exists: true
                  },
            }
    })
    var competitorsList = { 
      competitorsListArray: []
    }
    competitors.list.map((competitor)=>{
      delete competitor._id
      competitorsList.competitorsListArray.push(competitor)
    })
    return competitorsList
  }
  catch (error) {
    console.log(error)
    throw new Error (err)
  }
}

module.exports = {
  getCompetitorsList
}
