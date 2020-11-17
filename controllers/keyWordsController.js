const mongodbConnector = require("../connectors/mongodbConnector.js");
const _ = require("lodash");
const { options } = require("../routes/keyWordsRoutes.js");
const { searchKeywordsListByCompetitor } = require("./semRushController")

//route to get the key words list from database
async function getKeyWords(params) {
  try {
    let competitors = await mongodbConnector.list({
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
      competitors.list.map((keywords) => {
        // delete competitor._id
        keyWords.keyWordsArray.push(keywords)
      })
      return keyWords
    }
    else {
      // keyword search in case we need to return a non-listed competitor
      // let semRushResults = await searchKeywordsListByCompetitor(params)
      // keyWords.keyWordsArray.push(semRushResults)
      return keyWords
    }
  }
  catch (error) {
    console.log(error)
    throw new Error(err)
  }
}

// setWeeklySchedule - creates or updates a weekly keyword schedule in the database
async function setWeeklySchedule(params) {
  try {

    //determine current week start date and check if there are existing scheudles
    let currentDate = new Date();
    let startDate = new Date()
    let weekdayNumber = currentDate.getDay()
    startDate.setDate(currentDate.getDate() - weekdayNumber)
    startDate.setHours(0, 0, 0, 0);

    let plans = await mongodbConnector.list({
      collection: "week-plans",
      query: {
        "weekStartDate": {
          "$gte": startDate
        }
      }

    })

    let scheduleObject;
    if (plans.list.length > 0) {
      //update existing schedule
      scheduleObject = plans.list[0];
      scheduleObject.scheduledKeywords = []
    }

    else {
      //create a new one
      scheduleObject = {
        weekStartDate: startDate,
        lastUpdate: currentDate,
        scheduledKeywords: []
      }
    }


    params.selectedKeywords.map((keywordObject) => {
      keywordObject['title'] = ""
      keywordObject['tag'] = ""
      keywordObject['internalBacklinks'] = []
      scheduleObject.scheduledKeywords.push(keywordObject)
    })

    //update current week schedule
    if (scheduleObject._id) {
      await mongodbConnector.updateOne({
        collection: "week-plans",
        filter: {
          _id: scheduleObject._id
        },
        update: {
          $set: {
            weekStartDate: scheduleObject.weekStartDate,
            lastUpdate: scheduleObject.lastUpdate,
            scheduledKeywords: scheduleObject.scheduledKeywords
          }
        }
      }, true);
    }

    //create current week schedule
    else {
      await mongodbConnector.save({
        collection: "week-plans",
        document: scheduleObject
      });
    }

    return scheduleObject
  }

  catch (error) {
    console.log(error)
    throw new Error(err)
  }
}


// retrieveWeeklySchedule - retrieves a weekly keyword schedule in the database
// the date parameters must be in the format "YYYY-MM-DD" 
async function retrieveWeeklySchedule(params) {
  try {

    let filterDateQuery;

    //if the user specify intervals, retrieve every object in that date interval 
    if (params.startDate && params.endDate) {
      try {
        var startDateFilter = new Date(params.startDate)
        var endDateFilter = new Date(params.endDate)
      } catch (error) {
        throw new Error("Invalid date format for parameters\nERROR:\n" + JSON.stringify(error))
      }

      startDateFilter.setHours(0, 0, 0, 0);
      endDateFilter.setHours(23, 59, 59, 999);

      filterDateQuery = {
        "weekStartDate": {
          "$gte": startDateFilter,
          "$lte": endDateFilter
        }
      }
    }

    //if date not specified, get for the current week
    else {
      let currentDate = new Date();
      let weekStartDate = new Date()
      let weekdayNumber = currentDate.getDay()
      weekStartDate.setDate(currentDate.getDate() - weekdayNumber)
      weekStartDate.setHours(0, 0, 0, 0);
      filterDateQuery = {
        "weekStartDate": {
          "$gte": weekStartDate
        }
      }
    }
    let plans = await mongodbConnector.list({
      collection: "week-plans",
      query: filterDateQuery
    })

    let result = {
      schedule: plans.list
    };

    return result

  }

  catch (error) {
    console.log(error)
    throw new Error(err)
  }
}

module.exports = {
  getKeyWords,
  setWeeklySchedule,
  retrieveWeeklySchedule
}
