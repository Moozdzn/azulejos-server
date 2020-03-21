var express = require('express');
var router = express.Router();
var mongo = require('mongodb');
var assert = require('assert');
require('dotenv/config');

//var mongoDAO = require('../models/azulejosDAO');

router.get('/', function(req, res, next) {
    mongo.connect(process.env.DB_CONNECTION, function(err, client){
        if(err) throw err;

        var db = client.db('app_azulejos');
        db.collection('azulejos_info').find({}).toArray(function(findErr, docs) {
            if(findErr) throw findErr;
            console.log(docs);
            client.close();
            res.send(docs)
          });
    })
});

router.get('/teste', function(req,res,next){
    res.send('OK')
})

module.exports = router;