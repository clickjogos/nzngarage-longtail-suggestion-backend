const { findAll } = require("../connectors/mongodbConnector.js");

async function getTagsList() {
	try {
		let tagsList = await findAll({
			collection: 'tags',
		})

		return tagsList[0].tags
	} catch (error) {
		console.log(error)
		throw new Error(error)
	}
}



module.exports = {
    getTagsList
  }
  