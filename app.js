'use strict'

require('dotenv').config();

const express = require("express")
const cfenv = require("cfenv")
const cors = require('cors')
const app = express()
let appEnv = cfenv.getAppEnv()

//Import route files
const rootRoutes = require('./routes/rootRoutes')

//Data parsers for the request body
app.use(express.json())

//Allowing CORS to FRONTEND reqs in another domain
app.use(cors())

//Error handling
app.use((error, req, res, next) => {
    return res.status(500).send({ error })
})

//Define the route files here
app.use('/', rootRoutes)

//Starts the application server 
const port = process.env.port || 8080;
app.listen(port, function () {
    console.log("Server running at: http://localhost:" + port);
})

module.exports = app