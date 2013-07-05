var express = require('express');
var mongoose = require('mongoose');
var app = express();
var isProd = true;
var connectionString = (isProd ? 'mongodb://nodejitsu:3faed9d24c309a50616a77ab247bbd1b@dharma.mongohq.com:10005/nodejitsudb2365331477' : 'mongodb://localhost/test');
mongoose.connect(connectionString);
var db = mongoose.connection;
var kittySchema, Kitten;
db.on('error', function(err) {
	console.error('Connection error:', err);
});
db.once('open', function callback() {
	kittySchema = mongoose.Schema({
		name: String
	});
	kittySchema.methods.speak = function() {
		console.log("My name is " + (this.name ? this.name : "unknown"));
	}
	Kitten = mongoose.model('Kitten', kittySchema);
});

app.get('/', function(req, res) {
	var fluffy = new Kitten({ name: (Math.random() < 0.5 ? 'fluffy' : 'spot') });
	fluffy.save(function(err, fluffy) {
		if(err) {
			console.log("error saving fluffy");
		}
		else {
			fluffy.speak();
		}
	});
	Kitten.find({ name: /^fluff/ }, function(err, kittens) {
		if(err) {
			res.send("Howdy y'all");
		}
		else {
			res.send(kittens.length + " kittens named fluffy");
		}
	});
});

app.get('/hello.txt', function(req, res) {
	res.send("Hello World");
});

app.listen(3000);
console.log("Listening on port 3000");