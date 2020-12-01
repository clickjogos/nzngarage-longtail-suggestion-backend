const router = require("express").Router();
const tagsController = require('../controllers/tagsController')

router.get('/',async function(req, res) {
    try{
        var result = await tagsController.getTagsList()
        res.status(200).send(result)
    }
    catch(err){
        res.status(500).send('Internal Server Error');
    }
});
module.exports = router;

