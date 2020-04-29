var express = require('express');
var router = express.Router();
var mongo = require('mongodb');

require('dotenv/config');
var ObjectId = mongo.ObjectID;
var fs = require('fs');
const https = require('https');

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
router.get('/sessoes/azulejos', function(req,res,next){
    mongo.connect(process.env.DB_CONNECTION,{ useUnifiedTopology: true }, function(err, client){
        if(err) throw err;
        var db = client.db('app_azulejos');
        db.collection('azulejos_info').find({
            "Localizacao":{
                "$nearSphere":
                {
                    "$geometry": { 
                        "type":"Point", 
                        "coordinates": [parseFloat(req.query.lng),parseFloat(req.query.lat)]},
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
            res.send(doc)
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
router.post('/sessoes/azulejos', function(req,res,next){   
    const imageBuffer = new Buffer(req.body.file, "base64");
    const filePath = "./temporary_uploads/1.jpg";
    fs.writeFileSync(filePath, imageBuffer); 

    var document = {
        "Nome": req.body.nome,
        "Ano": req.body.ano,
        "Info": req.body.info,
        "Condicao": req.body.condicao,
        "Localizacao": {
            "type":"Point",
            "coordinates": req.body.coordinates
        }
    }
    mongo.connect(process.env.DB_CONNECTION,{ useUnifiedTopology: true }, function(err, client){
        if(err) throw err;
        var db = client.db('app_azulejos');
        
        db.collection("azulejos_info").insertOne(document, function(findErr, doc){
            if(findErr) throw findErr;
            client.close();
            console.log(doc)
            fs.readFile(filePath, function(err, data) {
                if (err) throw err;
              
                var options = {
                    'method': 'PUT',
                    'hostname': 'storage.bunnycdn.com',
                    'path': '/azulejos/'+doc.insertedId+'/1.jpg?AccessKey='+process.env.ACCESS_KEY,
                    'headers': {
                      'Content-Type': 'image/jpeg'
                    } 
                  };
                var reqBunny = https.request(options, function (resBunny) {
                    var chunks = [];
                  
                    resBunny.on("data", function (chunk) { chunks.push(chunk); });
                  
                    resBunny.on("end", function (chunk) {
                      var body = Buffer.concat(chunks);
                      res.send(body.toString());

                    });
        
                    resBunny.on("error", function (error) { res.send(error); });
                  });
                reqBunny.write(data);
                reqBunny.end();
              });
        })          
    })
})

router.put('/teste',function(requestes,response,next){
     
})

module.exports = router;