/* const MongoClient = require('mongodb');
require('dotenv/config')

// Connection URL
const uri = process.env.DB_CONNECTION;

var db;

MongoClient.connect(process.env.DB_CONNECTION,{ useUnifiedTopology: true }, function(err, client){
    if(err) throw err;
    db = client.db('app_azulejos');
    console.log('Connected to MongoDB');
})

module.exports = db; */