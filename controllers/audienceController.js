const _ = require('lodash')

const mssqlConnector = require('../connectors/mssqlConnector')
const { find } = require('../connectors/mongodbConnector')
const { getDateOnStringFormat } = require('../utils/utils')

async function execute(params) {
	try {
        
        let dateObject = await defineDateFilters(params)

        // var connectionPool = await mssqlConnector.SLQConnection()
        var connectionPool = ''

        let articlesIds = await recoverArticlesIds(dateObject.dateFormat)

        let articlesArray = await queryArticlesInSQL(connectionPool, articlesIds, dateObject.stringFormat)

        let articlesGrouppedByIdAndMonth = await groupArticlesByIdAndMonth(articlesArray)

        let articlesAudienceByMonth = await getAudienceByMonth(articlesGrouppedByIdAndMonth)


        return {articlesGrouppedByIdAndMonth, articlesAudienceByMonth}

	} catch (error) {
		console.error(error)
		throw error
	}
}

async function defineDateFilters(params){
    try {
        let dateObject = {
            stringFormat: {},
            dateFormat: {}
        }
        if( params.startDate && params.endDate ) {
            dateObject.stringFormat['startDate'] = params.startDate
            dateObject.stringFormat['endDate'] = params.endDate
            dateObject.dateFormat['startDate'] = new Date(params.startDate)
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

async function recoverArticlesIds(dateObject){
    try {
        
        let filterDateQuery = {
			weekStartDate: {
                $gte: dateObject.startDate,
                $lte: dateObject.endDate
            },
            scheduledKeywords: { $exists: true}
		}

		let schedulePlans = await find({
			collection: 'week-plans',
			query: filterDateQuery,
			fieldsToShow: {
				'scheduledKeywords.articleId': 1
			},
        })
        
        let articlesIdsArray = []
        schedulePlans.map( plan=>{
            plan.scheduledKeywords.map( keyword =>{
                articlesIdsArray.push(keyword.articleId)
            })
        })
        // let mongoQueryDate = setDateIntervalFilter(startDate, endDate)
        return articlesIdsArray
        // return [207361,205760,205970,205176,177783,177216]
    } catch (error) {
        console.error(error)
		throw error
    }
}

async function queryArticlesInSQL(connectionPool, articlesIds, dateObject) {
	try {      
        let articlesSet = articlesIds.join(",")
        articlesIds.map( (id, indexId) =>{
            if(indexId == 0) articlesSet = id
            else articlesSet = articlesSet + `,${id}`
        })

        // let startDate = '2020-01-01'
        // let endDate = '2020-11-27'

        let query = `SELECT [views_artigo] ,[views_data] ,[views_total]
                    FROM [Tec_data].[dbo].[materias_views]
                    WHERE 
                        ([views_artigo] IN (${articlesSet})) 
                        AND 
                        ([views_data] BETWEEN '${dateObject.startDate}' AND '${dateObject.endDate}')`

        // let articles = await connectionPool.request().query(query)
        
        return [
            {
              views_artigo: 177783,
              views_data: {
              },
              views_total: 14,
            },
            {
              views_artigo: 177783,
              views_data: {
              },
              views_total: 9,
            },
            {
              views_artigo: 177783,
              views_data: {
              },
              views_total: 6,
            },
            {
              views_artigo: 177783,
              views_data: {
              },
              views_total: 11,
            },
            {
              views_artigo: 177783,
              views_data: {
              },
              views_total: 2,
            },
            {
              views_artigo: 177783,
              views_data: {
              },
              views_total: 204,
            },
            {
              views_artigo: 177783,
              views_data: {
              },
              views_total: 4,
            },
            {
              views_artigo: 177783,
              views_data: {
              },
              views_total: 2,
            },
            {
              views_artigo: 177783,
              views_data: {
              },
              views_total: 2,
            },
            {
              views_artigo: 177783,
              views_data: {
              },
              views_total: 12,
            },
            {
              views_artigo: 177783,
              views_data: {
              },
              views_total: 1,
            },
            {
              views_artigo: 177783,
              views_data: {
              },
              views_total: 7,
            },
            {
              views_artigo: 177783,
              views_data: {
              },
              views_total: 3,
            },
            {
              views_artigo: 177783,
              views_data: {
              },
              views_total: 2,
            },
            {
              views_artigo: 177783,
              views_data: {
              },
              views_total: 8,
            },
            {
              views_artigo: 177783,
              views_data: {
              },
              views_total: 4,
            },
            {
              views_artigo: 177783,
              views_data: {
              },
              views_total: 2,
            },
            {
              views_artigo: 207361,
              views_data: {
              },
              views_total: 7201,
            },
            {
              views_artigo: 207361,
              views_data: {
              },
              views_total: 736,
            },
            {
              views_artigo: 177783,
              views_data: {
              },
              views_total: 18,
            },
            {
              views_artigo: 177783,
              views_data: {
              },
              views_total: 6,
            },
            {
              views_artigo: 177783,
              views_data: {
              },
              views_total: 3,
            },
            {
              views_artigo: 177783,
              views_data: {
              },
              views_total: 33,
            },
            {
              views_artigo: 177783,
              views_data: {
              },
              views_total: 4,
            },
            {
              views_artigo: 177783,
              views_data: {
              },
              views_total: 5,
            },
            {
              views_artigo: 177783,
              views_data: {
              },
              views_total: 3,
            },
            {
              views_artigo: 177783,
              views_data: {
              },
              views_total: 3,
            },
            {
              views_artigo: 177783,
              views_data: {
              },
              views_total: 8,
            },
            {
              views_artigo: 177783,
              views_data: {
              },
              views_total: 3,
            },
            {
              views_artigo: 177783,
              views_data: {
              },
              views_total: 6,
            },
            {
              views_artigo: 177783,
              views_data: {
              },
              views_total: 15,
            },
            {
              views_artigo: 177783,
              views_data: {
              },
              views_total: 13,
            },
            {
              views_artigo: 177783,
              views_data: {
              },
              views_total: 1,
            },
            {
              views_artigo: 177783,
              views_data: {
              },
              views_total: 2,
            },
            {
              views_artigo: 177783,
              views_data: {
              },
              views_total: 5,
            },
            {
              views_artigo: 177783,
              views_data: {
              },
              views_total: 1,
            },
            {
              views_artigo: 177783,
              views_data: {
              },
              views_total: 3,
            },
            {
              views_artigo: 177783,
              views_data: {
              },
              views_total: 7,
            },
            {
              views_artigo: 177783,
              views_data: {
              },
              views_total: 3,
            },
            {
              views_artigo: 177783,
              views_data: {
              },
              views_total: 7,
            },
            {
              views_artigo: 177783,
              views_data: {
              },
              views_total: 25,
            },
            {
              views_artigo: 177783,
              views_data: {
              },
              views_total: 5,
            },
            {
              views_artigo: 177783,
              views_data: {
              },
              views_total: 1,
            },
            {
              views_artigo: 177783,
              views_data: {
              },
              views_total: 6,
            },
            {
              views_artigo: 177783,
              views_data: {
              },
              views_total: 5,
            },
            {
              views_artigo: 177783,
              views_data: {
              },
              views_total: 2,
            },
            {
              views_artigo: 177783,
              views_data: {
              },
              views_total: 5,
            },
            {
              views_artigo: 177783,
              views_data: {
              },
              views_total: 9,
            },
            {
              views_artigo: 177783,
              views_data: {
              },
              views_total: 3,
            },
            {
              views_artigo: 177783,
              views_data: {
              },
              views_total: 62,
            },
            {
              views_artigo: 177783,
              views_data: {
              },
              views_total: 3,
            },
            {
              views_artigo: 177783,
              views_data: {
              },
              views_total: 3,
            },
            {
              views_artigo: 177783,
              views_data: {
              },
              views_total: 2,
            },
            {
              views_artigo: 177783,
              views_data: {
              },
              views_total: 6,
            },
            {
              views_artigo: 207361,
              views_data: {
              },
              views_total: 2074,
            },
            {
              views_artigo: 207361,
              views_data: {
              },
              views_total: 1727,
            },
            {
              views_artigo: 207361,
              views_data: {
              },
              views_total: 153,
            },
            {
              views_artigo: 177783,
              views_data: {
              },
              views_total: 11,
            },
            {
              views_artigo: 177783,
              views_data: {
              },
              views_total: 9,
            },
            {
              views_artigo: 177783,
              views_data: {
              },
              views_total: 2,
            },
            {
              views_artigo: 177783,
              views_data: {
              },
              views_total: 3,
            },
            {
              views_artigo: 177783,
              views_data: {
              },
              views_total: 1,
            },
            {
              views_artigo: 177783,
              views_data: {
              },
              views_total: 3034,
            },
            {
              views_artigo: 177783,
              views_data: {
              },
              views_total: 7,
            },
            {
              views_artigo: 177783,
              views_data: {
              },
              views_total: 6,
            },
            {
              views_artigo: 177783,
              views_data: {
              },
              views_total: 4,
            },
            {
              views_artigo: 177783,
              views_data: {
              },
              views_total: 8,
            },
            {
              views_artigo: 177783,
              views_data: {
              },
              views_total: 4,
            },
            {
              views_artigo: 177783,
              views_data: {
              },
              views_total: 5,
            },
            {
              views_artigo: 177783,
              views_data: {
              },
              views_total: 384,
            },
            {
              views_artigo: 177783,
              views_data: {
              },
              views_total: 2,
            },
            {
              views_artigo: 177783,
              views_data: {
              },
              views_total: 9,
            },
            {
              views_artigo: 177783,
              views_data: {
              },
              views_total: 11,
            },
            {
              views_artigo: 177783,
              views_data: {
              },
              views_total: 1,
            },
            {
              views_artigo: 177783,
              views_data: {
              },
              views_total: 7,
            },
            {
              views_artigo: 177783,
              views_data: {
              },
              views_total: 4,
            },
            {
              views_artigo: 177783,
              views_data: {
              },
              views_total: 2,
            },
          ]

		// return articles.recordset
	} catch (error) {
		console.error(error)
		throw error
	}
}

async function groupArticlesByIdAndMonth(articlesArray){
    try {
        let articlesGroupped = _(articlesArray)
        .groupBy('views_artigo')
        .map(function (group, key) {
            let response = {article: group[0].views_artigo, monthsAudience: []}
            let months = []
            group.map( row =>{
                let date = new Date(row.views_data)
                let month = date.getMonth()+1
                months.push({month:month, views_total:row.views_total })
            })
            response['monthsAudience'].push(months)
            response['totalAudience'] =  _.sumBy(group, 'views_total')
            return response
        })
        .value()

        await articlesGroupped.map( (articleGroup, articleGroupIndex) =>{
            let newMonthValues = _(articleGroup.monthsAudience[0])
                .groupBy('month')
                .map(function (group, key) {
                    return {
                        month: group[0].month, 
                        totalMonthAudience: _.sumBy(group, 'views_total')
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

async function getAudienceByMonth(articlesGrouppedById){
    try {
        
        let monthsValues = []
        articlesGrouppedById.map( group=>{
            monthsValues.push(...group.monthsAudience)
        } )


        // await articlesGroupped.map( (articleGroup, articleGroupIndex) =>{
            let newMonthValues = _(monthsValues)
                .groupBy('month')
                .map(function (group, key) {
                    return {
                        month: group[0].month, 
                        totalMonthAudience: _.sumBy(group, 'totalMonthAudience')
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

module.exports = {
    execute
}