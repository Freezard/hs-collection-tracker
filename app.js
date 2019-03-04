const express = require('express');
const fs = require('fs');
const request = require('request');
const cheerio = require('cheerio');
const path = require('path');
const app = express();
const { check, validationResult } = require('express-validator/check');

const port = process.env.PORT || 3000;

app.use("/css",  express.static(__dirname + '/css'));
app.use("/js", express.static(__dirname + '/js'));
app.use("/data", express.static(__dirname + '/data'));
app.use("/images",  express.static(__dirname + '/images'));

app.get('/',function(req,res) {
  res.sendFile(path.join(__dirname + '/index.html'));
});

app.get("/scrape", [
  check("user").trim().escape()
], function(req, res) {
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