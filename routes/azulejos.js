var express = require('express');
var router = express.Router();
var mongo = require('mongodb');
var assert = require('assert');
require('dotenv/config');

//var mongoDAO = require('../models/azulejosDAO');

router.get('/', function(req, res, next) {
    mongo.connect(process.env.DB_CONNECTION,{ useUnifiedTopology: true }, function(err, client){
        if(err) throw err;

        var db = client.db('app_azulejos');
        db.collection('azulejos_info').find({}).toArray(function(findErr, docs) {
            if(findErr) throw findErr;
            console.log(JSON.stringify(docs));
            client.close();
            res.send({docs})
          });
    }) 
});

router.post('/', function(req,res,next){
    mongo.connect(process.env.DB_CONNECTION,{ useUnifiedTopology: true }, function(err, client){
        if(err) throw err;

        var db = client.db('app_azulejos');
        db.collection('azulejos_info').find({
            "Localizacao":{
                "$nearSphere":
                {
                    "$geometry": { 
                        "type":"Point", 
                        "coordinates": [req.body.lng,req.body.lat]},
                    "$minDistance": 0,
                    "$maxDistance": 10000
                }
            }
        }).toArray(function(findErr, docs) {
            if(findErr) throw findErr;
            console.log(JSON.stringify(docs));
            client.close();
            res.send({docs})
          });
    })
})

module.exports = router;