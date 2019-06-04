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

app.get("/sync", function(req, res) {
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

app.get("/cardData", function(req, res) {
	var unirest = require('unirest');

	unirest.get("https://omgvamp-hearthstone-v1.p.rapidapi.com/cards?collectible=1")
	  .header("X-RapidAPI-Host", "omgvamp-hearthstone-v1.p.rapidapi.com")
	  .header("X-RapidAPI-Key", "pzJIPG9ZhwmshVy9K4m4VsaOI7J4p1djqnMjsny3h8IDKSG8H9")
	  .header("Content-Type", "application/json")
	  .end(function (result) {
		  res.send(result.body);
	  });
});

// https://hsreplay.net/collection/2/17115188/
app.get("/importHSReplay", [
  check("lo").trim().escape(),
  check("region").trim().escape(),
], function(req, res) {
	var url = "https://hsreplay.net/api/v1/collection/?account_lo=" + req.query.lo + "&format=json&region=" + req.query.region;

	request(url, { json: true }, function(error, response, html) {
		if (html.hasOwnProperty("collection"))
			res.send(html);
		else res.send(undefined);
	});
});

app.get("/importHearthPwn", [
  check("user").trim().escape()
], function(req, res) {
	var url = "https://www.hearthpwn.com/members/" + req.query.user + "/collection";

		request(url, function(error, response, html) {
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
				
				res.send(collection);
		});
   });

app.listen(port);

console.log('Server started.');

exports = module.exports = app;