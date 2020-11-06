const router = require("express").Router();
const rootController = require('../controllers/rootController')

router.get('/',async function(req, res) {
    try{
        res.status(200).send('serverok');
    }
    catch(err){
        res.status(500).send('Internal Server Error');
    }
});
router.post('/',async function(req, res) {
    try{
        var returnMessage = await rootController.checkServer();
        res.status(200).send("Received data: \n" + JSON.stringify(req.body));
    }
    catch(err){
        res.status(500).send('Internal Server Error');
    }
});
module.exports = router;