const router = require("express").Router();
const audienceController = require('../controllers/audienceController')

router.get('/',async function(req, res) {
    try{
        var result = await audienceController.execute(req.query)
        res.status(200).send(result)
    }
    catch(err){
        res.status(500).send(err);
    }
});
module.exports = router;

