var express = require('express');
var fs = require('fs');
var request = require('request');
var cheerio = require('cheerio');
var path = require('path');
var app = express();

const port = process.env.PORT || 3000;

// Add headers for local testing
/*app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);

    next();
});*/

app.use("/css",  express.static(__dirname + '/css'));
app.use("/js", express.static(__dirname + '/js'));
app.use("/data", express.static(__dirname + '/data'));
app.use("/images",  express.static(__dirname + '/images'));

app.get('/',function(req,res) {
  res.sendFile(path.join(__dirname + '/index.html'));
});

app.get("/scrape", function(req, res) {
	var url = "https://www.hearthpwn.com/members/" + req.query.user + "/collection";

	var promise = new Promise(function(resolve, reject) {
		request(url, function(error, response, html) {
			if (error) {
				reject(error);
			} else {
				var $ = cheerio.load(html);
				var collection = {};				
				var lastId = -1;
				
				$('.owns-card').filter(function() {
					var data = $(this);
					var id = data.attr("data-id");
					var copies = parseInt(data.find(".inline-card-count").attr("data-card-count"));
					var isGolden = (data.attr("data-is-gold") == "True");
					
					if (id == lastId) {
						if (isGolden)
							collection[id].golden = copies;
						else collection[id].normal = copies;
					}
					else
						collection[id] = {
							normal: isGolden ? 0 : copies,
							golden: isGolden ? copies : 0
						};
						
					lastId = id;
				});
				
				resolve(collection);
			}
		});
   });
   
   promise.then(function(result) {
		res.send(result);
   }, function(err) {
		console.log(err);
		res.send(undefined);
   });
});

app.listen(port);

console.log('Server started.');

exports = module.exports = app;