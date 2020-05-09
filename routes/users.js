var express = require('express');
var router = express.Router();
var mongo = require('mongodb');

require('dotenv/config');

/* GET users listing. */
router.post('/', function(req,res,next){
  console.log(req.body.username);
  console.log(req.body.password);
  mongo.connect(process.env.DB_CONNECTION,{ useUnifiedTopology: true }, function(err, client){
      if(err) throw err;
      var db = client.db('app_azulejos');
      
      db.collection('azulejos_user').findOne({"username": req.body.username}, function(findErr, doc){
          if(findErr) throw findErr;
          client.close();
          if(doc == null || doc.password != req.body.password) res.status(404).send({username: "Not Found"})
          else if(doc.password === req.body.password) res.status(200).send({_id: doc._id, username: doc.username})
          else{res.send('Internal error')}
      })
  })
})

module.exports = router;
