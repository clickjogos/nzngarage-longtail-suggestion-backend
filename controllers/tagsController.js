const { findAll, find, list } = require("../connectors/mongodbConnector.js");
const { setDateIntervalFilter, getCurrentWeekStartDate } = require('../utils/utils')

const collection_tags = 'tags'
const collection_weekPlans = 'week-plans'

// getTagsList - Recover all the possible values for Tag or only those in use 
async function getTagsList(params) {
	try {
		let mongoSearchObject = {			
			query: {}
		}
		//if the user specify intervals, retrieve every object in that date interval
		if (params.startDate && params.endDate) {
			mongoSearchObject.query['weekStartDate'] = await setDateIntervalFilter(params.startDate, params.endDate)
		}
		//if date not specified, get for the current week
		else {
			let weekStartDate = await getCurrentWeekStartDate()
			mongoSearchObject.query['weekStartDate'] = {
				$gt: weekStartDate,
			}
		}

		let tagsList = []
		let scheduleList
		if( !params.filter  ) {
			let mongoResponse = await findAll({
				collection: collection_tags
			})
			tagsList = mongoResponse[0].tags
		}
		else if(params.audience) {
			if( !params.startDate || !params.endDate) delete mongoSearchObject.query.weekStartDate
			mongoSearchObject.query['scheduledKeywords'] = { $elemMatch: { 'articleId': {$exists: true} }  }
			scheduleList = await find({
				collection: collection_weekPlans,
				query: mongoSearchObject.query,
				fieldsToShow: {
					'scheduledKeywords.tag': 1
				}
			})
			scheduleList.map( schedule =>{
				schedule.scheduledKeywords.map( row=>{
					var tagIndex = tagsList.indexOf(row.tag)
					if( tagIndex === -1 ) tagsList.push(row.tag)
					})
				} )
			
		}
		else {
			mongoSearchObject.query['scheduledKeywords'] = { $exists: true }			
				scheduleList = await find({
					collection: collection_weekPlans,
					query: mongoSearchObject.query,
					fieldsToShow: {
						'scheduledKeywords.tag': 1
					}
				})
				scheduleList.map( schedule =>{
					schedule.scheduledKeywords.map( row=>{
						var tagIndex = tagsList.indexOf(row.tag)
						if( tagIndex === -1 ) tagsList.push(row.tag)
						})
					} )
				
		}
			

		
	

		return tagsList
	} catch (error) {
		console.log(error)
		throw new Error(error)
	}
}



module.exports = {
    getTagsList
  }
  