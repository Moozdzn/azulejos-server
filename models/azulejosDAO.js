/* var client = require('./conn').client;
const assert = require('assert');

const dbName = 'app_azulejos';

module.exports.getAzulejos = function(cb,next) {

    client.connect(function(err){
        assert.equal(null, err);
        console.log("Connected");

        const db = client.db(dbName);

        findDocuments(db, function(){
            client.close();
        })
    })
}

const findDocuments = function(db, callback) {
    // Get the documents collection
    const collection = db.collection('azulejos_info');
    // Find some documents
    collection.find({}).toArray(function(err, docs) {
      assert.equal(err, null);
      console.log("Found the following records");
      console.log(docs)
      callback(docs);
    });
  } */