const { findAll, find } = require("../connectors/mongodbConnector.js");


// getTagsList - Recover all the possible values for Tag or only those in use 
async function getTagsList(params) {
	try {

		let tagsList = []
		if( !params.filter ) {
			let mongoResponse = await findAll({
				collection: 'tags',
			})

			tagsList = mongoResponse[0].tags
		} else {
			let scheduleList = await find({
				collection: 'week-plans',
				query: { 
					scheduledKeywords: { $exists: true }
				},
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
  