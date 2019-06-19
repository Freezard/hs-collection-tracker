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

app.get('/', function(req,res) {
  res.sendFile(path.join(__dirname + '/index.html'));
});

app.get("/cardData", function(req, res) {
	let unirest = require('unirest');

	unirest.get("https://omgvamp-hearthstone-v1.p.rapidapi.com/cards?collectible=1")
	  .header("X-RapidAPI-Host", "omgvamp-hearthstone-v1.p.rapidapi.com")
	  .header("X-RapidAPI-Key", "pzJIPG9ZhwmshVy9K4m4VsaOI7J4p1djqnMjsny3h8IDKSG8H9")
	  .header("Content-Type", "application/json")
	  .end(function (result) {
		  res.send(result.body);
	  });
});

app.get("/importHSReplay", [
  check("lo").isNumeric(),
  check("region").isNumeric(),
], function(req, res) {
	const errors = validationResult(req);
	if (!errors.isEmpty())
		 res.send(undefined);
	
	let url = "https://hsreplay.net/api/v1/collection/?account_lo=" + req.query.lo + "&format=json&region=" + req.query.region;

	request(url, { json: true }, function(error, response, html) {
		if (html.hasOwnProperty("collection"))
			res.send(html);
		else res.send(undefined);
	});
});

app.listen(port);

console.log('Server started.');

exports = module.exports = app;