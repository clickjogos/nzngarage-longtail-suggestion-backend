const router = require("express").Router();
const competitorsController = require('../controllers/competitorsController')

router.get('/getCompetitors',async function(req, res) {
    try{
        var result = await competitorsController.getCompetitorsList();
        res.status(200).send(result)
    }
    catch(err){
        res.status(500).send('Internal Server Error');
    }
});
module.exports = router;

