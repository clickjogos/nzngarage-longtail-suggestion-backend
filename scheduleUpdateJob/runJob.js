require('dotenv').config()
const mongdbConnector = require('./connectors/mongodbConnector')

function updateScheduledDates() {
    return new Promise(async (resolve, reject) => {

        // retrieve schedule with keywords tagged as scheduled
        let scheduleList = await mongdbConnector.find({
            collection: "week-plans",
            query: {
                scheduledKeywords: {
                    "$elemMatch": {
                        status: {
                            "$exists": true,
                            "$eq": "agendado"
                        }
                    }
                }
            }
        });

        let objectsToUpdate = scheduleList.map((schedule)=>{
            schedule.scheduledKeywords = schedule.scheduledKeywords.map((keywordObject)=>{
                if(keywordObject.status=="agendado"&&keywordObject.publishDate){
                    let publishDateObject = new Date(keywordObject.publishDate)
                    publishDateObject.setHours(0, 0, 0, 0)
                    let currentDateObject = new Date()
                    if(publishDateObject<=currentDateObject){
                        keywordObject.status="publicado"
                    }
                }
                return keywordObject
            })
            return schedule
        })

        await mongdbConnector.updateManyByField({
            collection:"week-plans",
            documents:objectsToUpdate
        },'_id')
        
    })
}

updateScheduledDates()
    .then((response) => {
        process.exit(0)
    })
    .catch((error) => {
        console.log(error)
        process.exit(1)
    })
