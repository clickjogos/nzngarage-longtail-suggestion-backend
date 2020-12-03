
const router = require("express").Router();
const semRushController = require('../controllers/semRushController')

router.get('/', function(req, res) {
    try{
        var result = semRushController.searchKeywordsList(req.query)
        res.status(200).send("Starting to get keywords value from SEMrush API")
    }
    catch(err){
        res.status(500).send('Internal Server Error');
    }
});
module.exports = router;

