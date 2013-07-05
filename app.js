var express = require('express');
var lessMiddleware = require('less-middleware');
var mongoose = require('mongoose');
var api = require('./apirouter.js');

var app = express();
if('production' === app.get('env')) {
	app.set('db uri', 'mongodb://nodejitsu:3faed9d24c309a50616a77ab247bbd1b@dharma.mongohq.com:10005/nodejitsudb2365331477');
}
else {
	app.set('db uri', 'mongodb://localhost/test');
}

mongoose.connect(app.get('db uri'));

app.use(lessMiddleware({ src: __dirname + "/public", compress : true }));
app.use(express.static(__dirname + '/public'));
app.use(express.bodyParser());

app.get('/api/items', api.getItems);
app.get('/api/item/:code', api.getItemByCode);
app.post('/api/item', api.createItem);
app.get('/', function(req, res) {
	res.render('index.jade', {
		title: 'my blog'
	})
});

app.listen(3000);