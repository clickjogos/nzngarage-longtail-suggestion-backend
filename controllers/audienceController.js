const _ = require('lodash')

const mssqlConnector = require('../connectors/mssqlConnector')
const { find } = require('../connectors/mongodbConnector')
const { getDateOnStringFormat } = require('../utils/utils')

async function execute(params) {
	try {
		let dateObject = await defineDateFilters(params)

		var connectionPool = await mssqlConnector.SLQConnection()
		// var connectionPool = ''

		let articles = await recoverArticlesIds(dateObject.dateFormat)

		let rawArticlesAudienceValues = await queryArticlesInSQL(connectionPool, articles.articlesIdsArray, dateObject.stringFormat)

		let audienceValuesGrouppedByIdAndMonth = await grouprawAudienceValuesByIdAndMonth(rawArticlesAudienceValues)

    let audienceAndDetailsValuesGroupped = await groupAudienceAndDetailsValues(audienceValuesGrouppedByIdAndMonth, articles.articlesDetails)

    let articlesAudienceByMonth = await getAudienceByMonth(audienceValuesGrouppedByIdAndMonth)
    
    let tableAndChartInfo = await structureTableAndChartInfo(articles.articlesIdsArray, articlesAudienceByMonth, audienceAndDetailsValuesGroupped)
    

		return tableAndChartInfo
	} catch (error) {
		console.error(error)
		throw error
	}
}

async function defineDateFilters(params) {
	try {
		let dateObject = {
			stringFormat: {},
			dateFormat: {},
		}
		if (params.startDate && params.endDate) {
			dateObject.stringFormat['startDate'] = params.startDate
      dateObject.stringFormat['endDate'] = params.endDate

      let paramsDate = new Date(params.startDate)
      dateObject.dateFormat['startDate'] = paramsDate
      let weekdayNumber = paramsDate.getDay()
      dateObject.dateFormat.startDate.setDate(paramsDate.getDate() - weekdayNumber)
      dateObject.dateFormat.startDate.setHours(0, 0, 0, 0)

			dateObject.dateFormat['endDate'] = new Date(params.endDate)
		} else {
			dateObject.dateFormat['endDate'] = new Date()
			dateObject.dateFormat['startDate'] = new Date()
			dateObject.dateFormat.startDate.setDate(dateObject.dateFormat.endDate.getDate())
			dateObject.dateFormat.startDate.setMonth(dateObject.dateFormat['endDate'].getMonth() - 12)
			dateObject.dateFormat.startDate.setHours(0, 0, 0, 0)

			dateObject.stringFormat['startDate'] = await getDateOnStringFormat(dateObject.dateFormat.startDate)
			dateObject.stringFormat['endDate'] = await getDateOnStringFormat(dateObject.dateFormat.endDate)
		}

		return dateObject
	} catch (error) {
		console.error(error)
		throw error
	}
}

async function recoverArticlesIds(dateObject) {
	try {
		let filterDateQuery = {
			weekStartDate: {
				$gte: dateObject.startDate,
				$lte: dateObject.endDate,
			},
			scheduledKeywords: { $exists: true },
		}

		let schedulePlans = await find({
			collection: 'week-plans',
			query: filterDateQuery,
			fieldsToShow: {
        'scheduledKeywords.articleId': 1,
        'scheduledKeywords.Keyword': 1,
        'scheduledKeywords.tag': 1,
        'scheduledKeywords.cmsLink': 1,
        'scheduledKeywords.title': 1,
        'scheduledKeywords.publishDate': 1
			},
		})

    if (schedulePlans.length > 0 ) {
      let articlesIdsArray = [] // [207361,205760,205970,205176,177783,177216]
      let articlesDetails = []
      schedulePlans.map((plan) => {
        plan.scheduledKeywords.map((keyword) => {
          if(keyword.articleId) {
            var articleIdIndex = articlesIdsArray.indexOf(keyword.articleId)
            if (articleIdIndex === -1) {
              articlesIdsArray.push(keyword.articleId)
              articlesDetails.push(keyword)
            }
  
            // articlesIdsArray.push(keyword.articleId) 
          }
        })
      })
  
      return { articlesIdsArray, articlesDetails }
    } else {
      throw new Error("You don't have any shedule on this date")
    }
    
		// return [207361,205760,205970,205176,177783,177216]
	} catch (error) {
		console.error(error)
		throw error
	}
}

async function queryArticlesInSQL(connectionPool, articlesIds, dateObject) {
	try {
		let articlesSet = articlesIds.join(',')
		articlesIds.map((id, indexId) => {
			if (indexId == 0) articlesSet = id
			else articlesSet = articlesSet + `,${id}`
		})

		let query = `SELECT [views_artigo] ,[views_data] ,[views_total]
                    FROM [Tec_data].[dbo].[materias_views]
                    WHERE 
                        ([views_artigo] IN (${articlesSet})) 
                        AND 
                        ([views_data] BETWEEN '${dateObject.startDate}' AND '${dateObject.endDate}')`

		let articles = await connectionPool.request().query(query)

		return articles.recordset
	} catch (error) {
		console.error(error)
		throw error
	}
}

async function grouprawAudienceValuesByIdAndMonth(articlesArray) {
	try {
		let articlesGroupped = _(articlesArray)
			.groupBy('views_artigo')
			.map(function (group, key) {
				let response = { articleId: group[0].views_artigo, monthsAudience: [] }
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

		// await articlesGroupped.map( (articleGroup, articleGroupIndex) =>{
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
		// })

		// return
	} catch (error) {
		console.error(error)
		throw error
	}
}

async function groupAudienceAndDetailsValues(audienceValuesGrouppedByIdAndMonth, articlesDetails){
  try {
    
    let mapArray = [...audienceValuesGrouppedByIdAndMonth, ...articlesDetails]

   let group= await  _(mapArray)
				.groupBy('articleId')
				.map(function (group, key) {          
          let responseObject={articleId: parseInt(key)}
          group.map( gValues =>{
            let keys = Object.keys(gValues)
            keys.map( key => {
              if(key !== 'articleId') responseObject[key] = gValues[key]
            })
          })
					return responseObject
				})
				.value()
    
return group
  } catch (error) {
    console.error(error)
		throw error
  }
}

async function structureTableAndChartInfo(articlesIds, articlesAudienceByMonth, audienceAndDetailsValuesGroupped) {
	try {
    let objectResponse = {
      "chartInfo": [],
      "tableInfo": []
    }

    let a = articlesIds.map( (articleId, indexArticleId) =>{
      let findIdMonthValues = audienceAndDetailsValuesGroupped.find( item=> item.articleId === articleId )
      let keys = Object.keys(findIdMonthValues)

      let objectToTable = {}
      keys.map( key =>{
        objectToTable[key] = findIdMonthValues[key]
      })
      objectResponse.tableInfo.push(objectToTable)

      let monthValues = findIdMonthValues.monthsAudience
      let b = monthValues.map( monthValue =>{
          let findMonth = objectResponse.chartInfo.findIndex( item => item.month === monthValue.month)
          let findmonth2 = articlesAudienceByMonth.find( item => item.month === monthValue.month)
          if(findMonth != -1) {
              objectResponse.chartInfo[findMonth].articles.push(articleId)
          }
          else {
              objectResponse.chartInfo.push({
                  month: monthValue.month,
                  articles: [articleId],
                  totalMonthAudience: findmonth2.totalMonthAudience
              })
          }
      })

  })
    return objectResponse
	} catch (error) {
		console.error(error)
		throw error
	}
}

module.exports = {
	execute,
}
