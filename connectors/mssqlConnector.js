var sql = require('mssql')

var config = {
  server: process.env.MSSQL_HOST,
  requestTimeout: 999999999,
  options: {
    database: process.env.MSSQL_DB,
    encrypt: false
  },
  authentication: {
    type: 'default',
    options: {
      userName: process.env.MSSQL_USERNAME,
      password: process.env.MSSQL_PASSWORD
    }
  }
}

async function SLQConnection() {
  try {
    return await sql.connect(config)
  } catch (error) {
    throw error
  }
}

module.exports = {
  SLQConnection
}