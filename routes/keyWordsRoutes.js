const router = require("express").Router();
const keyWordsController = require('../controllers/keyWordsController')

router.get('/getKeyWordsList/:domain',async function(req, res) {
    try{
        var result = await keyWordsController.getKeyWords(req.params);
        res.status(200).send(result)
    }
    catch(err){
        res.status(500).send('Internal Server Error');
    }
});

router.post('/weeklyschedule',async function(req, res) {
    try{
        var result = await keyWordsController.setWeeklySchedule(req.body);
        res.status(200).send(result)
    }
    catch(err){
        res.status(500).send('Internal Server Error');
    }
});
module.exports = router;
