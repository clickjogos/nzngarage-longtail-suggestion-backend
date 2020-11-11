const semRushRoutes = require("express").Router()
const semRush = require('../controllers/semRushController')

semRushRoutes.get('/prelist',async function(req, res, next) {
    try{
        var resp = await semRush.searchKeywordsList().catch(error => { throw new Error(error) })
        res.status(200).send(resp)
    }
    catch(error){
        next(error)
    }
})


module.exports = semRushRoutes