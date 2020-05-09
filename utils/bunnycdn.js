const https = require('https');
var fs = require('fs');
require('dotenv/config');

var options = {
  'method': 'PUT',
  'hostname': 'storage.bunnycdn.com',
  'path': '/azulejos/Diogo.jpg?AccessKey='+process.env.ACCESS_KEY,
  'headers': {
    'Content-Type': 'image/jpeg'
  }
};

var req = https.request(options, function (res) {
  var chunks = [];

  res.on("data", function (chunk) {
    chunks.push(chunk);
  });

  res.on("end", function (chunk) {
    var body = Buffer.concat(chunks);
    console.log(body.toString());
  });

  res.on("error", function (error) {
    console.error(error);
  });
});

var postData = fs.createWriteStream("./temporary_uploads/image.jpg");;

req.write(postData);

req.end();