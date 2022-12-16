"use strict";

const express = require('express');
const request = require('request');
const favicon = require('serve-favicon')
const path = require('path');
const app = express();
const { check, validationResult } = require('express-validator');

const port = process.env.PORT || 3000;

app.use("/css",  express.static(__dirname + '/css'));
app.use("/js", express.static(__dirname + '/js'));
app.use("/data", express.static(__dirname + '/data'));
app.use("/images",  express.static(__dirname + '/images'));
app.use(favicon(path.join(__dirname, 'images', 'favicon.ico')))

app.get('/', function(req,res) {
	res.sendFile(path.join(__dirname + '/index.html'));
});

app.get("/cardData", function(req, res) {
	const url = "https://api.hearthstonejson.com/v1/latest/enUS/cards.collectible.json";

	request(url, { json: true }, function(error, response, body) {
		res.send(body);
	});
});

app.get("/data", function(req, res) {
	const url = "/data/" + req.query.fileName + ".json";
	
	res.sendFile(path.join(__dirname + url));
});

app.get("/importHSReplay", [
  check("lo").isNumeric(),
  check("region").isNumeric(),
], function(req, res) {
	const errors = validationResult(req);
	if (!errors.isEmpty())
		 res.send(undefined);
	
	const url = "https://hsreplay.net/api/v1/collection/?account_lo=" + req.query.lo +
	  "&format=json&region=" + req.query.region;

	request(url, { json: true }, function(error, response, body) {
		if (body.hasOwnProperty("collection"))
			res.send(body);
		else res.send(undefined);
	});
});

app.listen(port);

console.log('Server started.');

exports = module.exports = app;