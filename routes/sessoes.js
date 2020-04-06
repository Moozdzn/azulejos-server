var express = require('express');
var router = express.Router();
var mongo = require('mongodb');
var assert = require('assert');
require('dotenv/config');
var ObjectId = mongo.ObjectID;

// DEVOLVE NOME DOS AZULEJOS PARA AUTOCOMPLETE
router.get('/:sessoes/azulejos/nome', function(req, res, next) {
    mongo.connect(process.env.DB_CONNECTION,{ useUnifiedTopology: true }, function(err, client){
        var db = client.db('app_azulejos');

        if(err) throw err;
        if(req.params.sessoes == "sessoes") {
            db.collection('azulejos_info').find({},{projection:{Nome:1}}).toArray(function(findErr, docs) {
                if(findErr) throw findErr;
                client.close();
                res.send({docs})
              });
        }
        else{
            var sessao = new ObjectId(req.params.sessoes);
            db.collection('azulejos_info').find({"Sessao":{"$eq":sessao}},{projection:{Nome:1}}).toArray(function(findErr, docs) {
                if(findErr) throw findErr;
                client.close();
                res.send({docs})
              });
        }

        
        
    }) 
});
//DEVOLVE LOCALIZACAO DOS AZULEJOS ATE 5KM DA POSICAO DO UTILIZADOR
router.post('/sessoes/azulejos', function(req,res,next){
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
                    "$maxDistance": 5000
                }
            }
        },{"Info": 0,"Ano": 0,"Condicao": 0}).toArray(function(findErr, docs) {//Not working
            if(findErr) throw findErr;
            client.close();
            res.send({docs})
          });
    })
})
//DEVOLVE INFORMACAO DE UM UNICO AZULEJO
router.get('/sessoes/:id', function(req,res,next){
    mongo.connect(process.env.DB_CONNECTION,{ useUnifiedTopology: true }, function(err, client){
        if(err) throw err;
        var marker = new ObjectId(req.params.id)
        var db = client.db('app_azulejos');
        
        db.collection("azulejos_info").findOne({"_id":marker}, function(findErr, doc){
            if(findErr) throw findErr;
            client.close();
            res.send(doc);
        })          
    })
})
//DEVOLVE INFORMACAO DA SESSAO
router.get('/:id', function(req,res,next){
    mongo.connect(process.env.DB_CONNECTION,{ useUnifiedTopology: true }, function(err, client){
        if(err) throw err;
        var marker = new ObjectId(req.params.id)
        var db = client.db('app_azulejos');
        
        db.collection("azulejos_sessoes").findOne({"_id":marker}, function(findErr, doc){
            if(findErr) throw findErr;
            client.close();
            res.send(doc);
        })          
    })
})

module.exports = router;