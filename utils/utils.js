// getDateString receives a date in Date format and return a YYYY-MM-DD string format
async function getDateOnStringFormat(date) {
	try {
		let dateSplitted = date.toString().split(' ')
		let day = dateSplitted[2]
		let month = await getMonthNumber(dateSplitted[1])
		let year = dateSplitted[3]

		return (`${year}-${month}-${day}`) 
	} catch (error) {
		throw new Error('Invalid date format for parameters\nERROR:\n' + JSON.stringify(error))
	}
}

function getMonthNumber(month) {
	switch (month) {
		case 'Jan':
			return '01'
		case 'Feb':
			return '02'
		case 'Mar':
			return '03'
		case 'Apr':
			return '04'
		case 'May':
			return '05'
		case 'Jun':
			return '06'
		case 'Jul':
			return '07'
		case 'Aug':
			return '08'
		case 'Sep':
			return '09'
		case 'Oct':
			return '10'
		case 'Nov':
			return '11'
		case 'Dec':
			return '12'

		default:
			break
	}
}

async function getDateOnDateFormat(date) {
	try {
		let dateSplitted = date.toString().split(' ')
		let day = dateSplitted[2]
		let month = await getMonthNumber(dateSplitted[1])
		let year = dateSplitted[3]

		return (`${year}-${month}-${day}`) 
	} catch (error) {
		throw new Error('Invalid date format for parameters\nERROR:\n' + JSON.stringify(error))
	}
}

//setDateIntervalFilters receives two date strings in the YYYY-MM-DD format and returns a mongo-formated date filter
function setDateIntervalFilter(startDate, endDate) {
	try {
		var startDateFilter = new Date(startDate)
		var endDateFilter = new Date(endDate)
		startDateFilter.setHours(0, 0, 0, 0)
		endDateFilter.setHours(23, 59, 59, 999)
		let filterObject = {
			$gt: startDateFilter,
			$lte: endDateFilter,
		}
		return filterObject
	} catch (error) {
		throw new Error('Invalid date format for parameters\nERROR:\n' + JSON.stringify(error))
	}
}


function getCurrentWeekStartDate() {
	let currentDate = new Date()
	let currentWeekStartDate = new Date()
	let weekdayNumber = currentDate.getDay()
	//remove an extra day for timezone differences
	currentWeekStartDate.setDate(currentDate.getDate() - (weekdayNumber + 1))
	currentWeekStartDate.setHours(0, 0, 0, 0)
	return currentWeekStartDate
}

module.exports = {
	getDateOnStringFormat,
	getDateOnDateFormat,
	setDateIntervalFilter,
	getCurrentWeekStartDate
}
