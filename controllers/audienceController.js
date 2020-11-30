const _ = require('lodash')

const mssqlConnector = require('../connectors/mssqlConnector')

async function execute() {
	try {
		var connectionPool = await mssqlConnector.SLQConnection()

		let articlesIds = await recoverArticlesIds()

		let articlesArray = await queryArticlesInSQL(connectionPool, articlesIds)

		let articlesGrouppedByIdAndMonth = await groupArticlesByIdAndMonth(articlesArray)

		let articlesAudienceByMonth = await getAudienceByMonth(articlesGrouppedByIdAndMonth)

		return { articlesGrouppedByIdAndMonth, articlesAudienceByMonth }
	} catch (error) {
		console.error(error)
		throw error
	}
}

async function recoverArticlesIds() {
	try {
		return [207361, 205760, 205970, 205176, 177783, 177216]
	} catch (error) {
		console.error(error)
		throw error
	}
}

async function queryArticlesInSQL(connectionPool, articlesIds) {
	try {
		let articlesSet = articlesIds.join(',')
		articlesIds.map((id, indexId) => {
			if (indexId == 0) articlesSet = id
			else articlesSet = articlesSet + `,${id}`
		})

		let startDate = '2020-01-01'
		let endDate = '2020-11-27'

		let query = `SELECT [views_artigo] ,[views_data] ,[views_total]
                    FROM [Tec_data].[dbo].[materias_views]
                    WHERE 
                        ([views_artigo] IN (${articlesSet})) 
                        AND 
                        ([views_data] BETWEEN '${startDate}' AND '${endDate}')`

		let articles = await connectionPool.request().query(query)

		return articles.recordset
	} catch (error) {
		console.error(error)
		throw error
	}
}

async function groupArticlesByIdAndMonth(articlesArray) {
	try {
		let articlesGroupped = _(articlesArray)
			.groupBy('views_artigo')
			.map(function (group, key) {
				let response = { article: group[0].views_artigo, monthsAudience: [] }
				let months = []
				group.map((row) => {
					let date = new Date(row.views_data)
					let month = date.getMonth() + 1
					months.push({ month: month, views_total: row.views_total })
				})
				response['monthsAudience'].push(months)
				response['totalAudience'] = _.sumBy(group, 'views_total')
				return response
			})
			.value()

		await articlesGroupped.map((articleGroup, articleGroupIndex) => {
			let newMonthValues = _(articleGroup.monthsAudience[0])
				.groupBy('month')
				.map(function (group, key) {
					return {
						month: group[0].month,
						totalMonthAudience: _.sumBy(group, 'views_total'),
					}
				})
				.value()

			articlesGroupped[articleGroupIndex].monthsAudience = newMonthValues
			return articlesGroupped
		})

		return articlesGroupped
	} catch (error) {
		console.error(error)
		throw error
	}
}

async function getAudienceByMonth(articlesGrouppedById) {
	try {
		let monthsValues = []
		articlesGrouppedById.map((group) => {
			monthsValues.push(...group.monthsAudience)
		})

		let newMonthValues = _(monthsValues)
			.groupBy('month')
			.map(function (group, key) {
				return {
					month: group[0].month,
					totalMonthAudience: _.sumBy(group, 'totalMonthAudience'),
				}
			})
			.value()

		return newMonthValues
	} catch (error) {
		console.error(error)
		throw error
	}
}

module.exports = {
	execute,
}
