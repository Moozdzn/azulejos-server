var express = require('express');
var router = express.Router();
var mongo = require('mongodb');

require('dotenv/config');
var ObjectId = mongo.ObjectID;
var fs = require('fs');
const https = require('https');

const translate = require("@vitalets/google-translate-api");

/*
/api/sessoes/azulejos/nome
/api/sessoes/azulejos
*/

// DEVOLVE NOME DOS AZULEJOS PARA AUTOCOMPLETE
router.get('/:sessoes/azulejos/nome', function (req, res, next) {
    mongo.connect(process.env.DB_CONNECTION, {
        useUnifiedTopology: true
    }, function (err, client) {
        var db = client.db('app_azulejos');

        if (err) 
            throw err;
        


        if (req.params.sessoes == "sessoes") {
            db.collection('azulejos_info').find({}, {
                projection: {
                    Nome: 1
                }
            }).toArray(function (findErr, docs) {
                if (findErr) 
                    throw findErr;
                


                client.close();
                res.send({docs})
            });
        } else {
            var sessao = new ObjectId(req.params.sessoes);
            db.collection('azulejos_info').find({
                "Sessao": {
                    "$eq": sessao
                }
            }, {
                projection: {
                    Nome: 1
                }
            }).toArray(function (findErr, docs) {
                if (findErr) 
                    throw findErr;

                client.close();
                res.send({docs});
            });
        }
    })
});
// DEVOLVE LOCALIZACAO DOS AZULEJOS ATE 5KM DA POSICAO DO UTILIZADOR
router.get('/sessoes/azulejos', function (req, res, next) {
    mongo.connect(process.env.DB_CONNECTION, {
        useUnifiedTopology: true
    }, function (err, client) {
        if (err) 
            throw err;

        var db = client.db('app_azulejos');
        // const documents = await
        db.collection('azulejos_info').aggregate([{
                "$geoNear": {
                    "near": {
                        "type": "Point",
                        "coordinates": [
                            parseFloat(req.query.lng),
                            parseFloat(req.query.lat)
                        ]
                    },
                    "distanceField": "distance",
                    "maxDistance": req.query.radius * 1000,
                    "spherical": true
                }
            }]).toArray(function (err, items) {
            res.send(items);
            client.close();
        });;
        // res.send(documents);
    })
})
// DEVOLVE INFORMACAO DE UM UNICO AZULEJO
router.get('/sessoes/:id', function (req, res, next) {

    mongo.connect(process.env.DB_CONNECTION, {
        useUnifiedTopology: true
    }, function (err, client) {
        if (err) 
            throw err;

        if (req.params.id != null) {
            try {
                var marker = new ObjectId(req.params.id);
                var db = client.db('app_azulejos');

                db.collection("azulejos_info").findOne({
                    "_id": marker
                }, function (findErr, doc) {
                    if (findErr) 
                        throw findErr;
                    client.close();
                    https.get('https://storage.bunnycdn.com/azulejos/' + req.params.id + '/?AccessKey=' + process.env.ACCESS_KEY, (response) => {
                        console.log('statusCode:', response.statusCode);
                        response.on('data', (d) => {
                            var json = JSON.parse(d.toString()).length
                            doc['nrImages'] = json;
                            if(req.query.lan != 'pt'){
                                translateText(doc.Info,req.query.lan).then(response =>{
                                    doc['InfoOriginal'] = doc.Info;
                                    doc.Info = response.text;
                                    res.send(doc);
                                });
                            } else {
                                res.send(doc);
                            }
                        });
                    }).on('error', (e) => {
                        console.error(e);
                    });
                })
            } catch (e) { // res.sendStatus(500).send({error:"Internal Server error"});
            }
        } else {
            console.log('here')
            res.sendStatus(404).send({error: "Tile id cannot be undefined"});
        }
    })
})
// DEVOLVE INFORMACAO DA SESSAO
router.get('/:id', function (req, res, next) {

    mongo.connect(process.env.DB_CONNECTION, {
        useUnifiedTopology: true
    }, function (err, client) {
        if (err) 
            throw err;
        var marker = new ObjectId(req.params.id)
        var db = client.db('app_azulejos');

        db.collection("azulejos_sessoes").findOne({
            "_id": marker
        }, function (findErr, doc) {
            if (findErr) 
                throw findErr;
            client.close();
            res.send(doc);
        })
    })

})

router.put('/:id', function (req, res, next) {
    mongo.connect
})



router.get('/sessoes/azulejos/translate', function (req, res, next) {
    
    translateText('Hello wold','es').then(x =>{
        res.send(x)
    })
})

async function translateText(text,target){
    const response = await translate(text, {to: target});
    return response;
}

// Creates session
router.post('/sessoes', function (req, res, next) {
    uploadPhotos(req.body.azulejos);
    mongo.connect(process.env.DB_CONNECTION, {
        useUnifiedTopology: true
    }, function (err, client) {
        if (err) 
            throw err;
        


        var sessionID = new ObjectId(req.body.sessao._id);
        var userID = new ObjectId(req.body.sessao.idAutor);
        var db = client.db('app_azulejos');

        db.collection("azulejos_sessoes").insertOne({
            "_id": sessionID,
            "data": new Date().toISOString(),
            "estado": req.body.sessao.estado,
            "info": req.body.sessao.info,
            "idAutor": userID,
            "azulejos": req.body.sessao.azulejos
        }, function (findErr, doc) {
            if (findErr) 
                throw findErr;
            


            var documents = [];
            for (var i in req.body.azulejos) {
                var azulejo = req.body.azulejos[i];
                var document = {
                    "_id": new ObjectId(azulejo._id),
                    "Nome": azulejo.Nome,
                    "Ano": azulejo.Ano,
                    "Info": azulejo.Info,
                    "Condicao": azulejo.Condicao,
                    "Sessao": sessionID,
                    "Localizacao": {
                        "type": "Point",
                        "coordinates": azulejo.Localizacao
                    }
                }
                documents.push(document);
            }
            console.log(documents)
            db.collection("azulejos_info").insertMany(documents, function (findErr, doc) {
                if (findErr) 
                    throw findErr;
                


                console.log(doc)
                client.close();
            });
        })
        res.send("done")
    })
})

function uploadPhotos(azulejos) {

    var teste = []
    var body;
    for (const j in azulejos) {
        var filePathArray = [];
        for (var i in azulejos[j].Files) {

            const imageBuffer = new Buffer(azulejos[j].Files[i], "base64");
            const filePath = "./temporary_uploads/" + azulejos[j]._id + "-" + i + ".jpg";
            filePathArray.push(filePath);
            fs.writeFileSync(filePath, imageBuffer);
        }
        for (const i in filePathArray) {
            console.log(filePathArray[i])

            fs.readFile(filePathArray[i], function (err, data) {
                if (err) 
                    throw err;
                


                console.log(filePathArray[i])
                var options = {
                    'method': 'PUT',
                    'hostname': 'storage.bunnycdn.com',
                    'path': '/azulejos/' + azulejos[j]._id + '/' + i + '.jpg?AccessKey=' + process.env.ACCESS_KEY,
                    'headers': {
                        'Content-Type': 'image/jpeg'
                    }
                };
                var reqBunny = https.request(options, function (resBunny) {
                    var chunks = [];

                    resBunny.on("data", function (chunk) {
                        chunks.push(chunk);
                    });
                    resBunny.on("end", function (chunk) {
                        body = Buffer.concat(chunks);
                        teste.push(body.toString());

                    });
                    resBunny.on("error", function (error) {
                        res.send(error);
                    });
                });
                reqBunny.write(data);
                reqBunny.end();
            });
        }
    }
}
module.exports = router;

// Deprecated routes

// INSERE UM AZULEJO NA BASE DE DADOS E AS RESPETIVAS IMAGENS NO BUNNYCDN
/* router.post('/sessoes/azulejos', function(req,res,next){
    var filePathArray = [];
    var teste = []
    var body;
    for (var i in req.body.file){
        const imageBuffer = new Buffer(req.body.file[i], "base64");
        const filePath = "./temporary_uploads/"+i+".jpg";
        filePathArray.push(filePath);
        fs.writeFileSync(filePath, imageBuffer);
    }
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
    if(req.body.sessionID != false){
        var sessionID = new ObjectId(req.body.sessionID);
        document['Sessao'] = sessionID
    }
    
    mongo.connect(process.env.DB_CONNECTION,{ useUnifiedTopology: true }, function(err, client){
        if(err) throw err;
        var db = client.db('app_azulejos');
        
        db.collection("azulejos_info").insertOne(document, function(findErr, doc){
            if(findErr) throw findErr;
            client.close();
            for(const i in filePathArray){
                console.log(filePathArray[i])

                fs.readFile(filePathArray[i], function(err, data) {
                    if (err) throw err;
                    console.log(filePathArray[i])
                    var options = {
                        'method': 'PUT',
                        'hostname': 'storage.bunnycdn.com',
                        'path': '/azulejos/'+doc.insertedId+'/'+i+'.jpg?AccessKey='+process.env.ACCESS_KEY,
                        'headers': {
                          'Content-Type': 'image/jpeg'
                        } 
                      };
                    var reqBunny = https.request(options, function (resBunny) {
                        var chunks = [];
    
                        resBunny.on("data", function (chunk) { chunks.push(chunk); });
                        resBunny.on("end", function (chunk) {
                          body = Buffer.concat(chunks);
                          teste.push(body.toString());
                          
                        });
                        resBunny.on("error", function (error) { res.send(error); });
                      });
                    reqBunny.write(data);
                    reqBunny.end();
                });
            }
            res.send('done'); 
        })          
    })
}) */
