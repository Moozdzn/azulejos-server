var express = require('express');
var router = express.Router();
var mongo = require('mongodb');
var assert = require('assert');
require('dotenv/config');
var ObjectId = mongo.ObjectID;




var path = require('path');
var fs = require('fs');
//
const {google} = require('googleapis');

var outDir = path.join(__dirname,"uploads");


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
            require("../gdrive/gdrive-auth")((auth) => {
                const drive = google.drive({version: 'v3', auth});
                var pageToken = null;
                drive.files.list({
                    q: "mimeType='application/vnd.google-apps.folder' and name contains '"+req.params.id+"'",
                    fields: 'nextPageToken, files(id)',
                    spaces: 'drive',
                    pageToken: pageToken
                }).then((response)=>{
                    console.log(response.data.files[0].id)
                    drive.files.list({
                        q: `'${response.data.files[0].id}' in parents`,
                        fields: 'nextPageToken, files(id, name)',
                        spaces: 'drive',
                        pageToken: pageToken
                      }).then((response)=> {
                            var filePath = './temporary_uploads/'+response.data.files[0].name
                            var dest = fs.createWriteStream(filePath);
                            drive.files.get({fileId: response.data.files[0].id,alt: 'media'},{responseType: 'stream'}).then((response)=>{
                                response.data.on('end', function () {
                                    var bitmap = fs.readFileSync(filePath, { encoding: 'base64' });
                                    console.log('Done');
                                    doc['file'] = bitmap;
                                    res.send(doc);
                                    }).on('error', function (err) {
                                    console.log('Error during download', err);
                                    }).pipe(dest);
                            })
                      });
                });
                
            });
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
    const filePath = "./temporary_uploads/"+req.body.nome+".jpg";
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
            require("../gdrive/gdrive-auth")((auth) => {
                const drive = google.drive({version: 'v3', auth});
                var fileMetadata = {
                    'name': doc.insertedId,
                    'mimeType': 'application/vnd.google-apps.folder'
                  };
                  drive.files.create({
                    resource: fileMetadata,
                    fields: 'id'
                  }, function (err, file) {
                    if (err) {
                      // Handle error
                      console.error(err);
                      res.status(500).send('Aconteceu um erro interno ao guardar a fotografia. Tente novamente mais tarde.');
                    } else {
                        var folderId = file.data.id;
                        var fileMetadata = {
                            'name': 'file.jpg',
                            parents: [folderId]
                        };
                        var media = {
                            mimeType: 'image/jpeg',
                            body: fs.createReadStream("./temporary_uploads/"+req.body.nome+".jpg")
                        };
                        drive.files.create({
                            resource: fileMetadata,
                            media: media,
                            fields: 'id'
                        }, function (err, file) {
                            if (err) {
                                // Handle error
                                console.error(err);
                                res.status(500).send('Aconteceu um erro interno ao guardar a fotografia. Tente novamente mais tarde.');
                            } else {
                                res.status(200).send('Submissão recebida');
                            }
                        });
                    }
                  });
            });
        })          
    })
})

module.exports = router;