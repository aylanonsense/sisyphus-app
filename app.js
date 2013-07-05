var express = require('express.io');
var lessMiddleware = require('less-middleware');
var mongoose = require('mongoose');
var router = require('./htmlrouter.js');
var api = require('./apirouter.js');

var app = express();
app.http().io();

if('production' === app.get('env')) {
	app.set('db uri', 'mongodb://nodejitsu:3faed9d24c309a50616a77ab247bbd1b@dharma.mongohq.com:10005/nodejitsudb2365331477');
}
else {
	app.set('db uri', 'mongodb://localhost/test');
}

mongoose.connect(app.get('db uri'));

app.use(lessMiddleware({ src: __dirname + "/public", compress : true }));
app.use(express.bodyParser());
app.use(express.static(__dirname + '/public'));

app.get('/api/items', api.getItems);
app.get('/api/item/:code', api.getItemByCode);
app.post('/api/item', api.createItem);
app.delete('/api/item/:code', api.removeItemByCode);

app.io.route('ready', function(socket) {
	socket.io.emit('talk', {
		message: 'io event from an io route on the server'
	});
});

app.io.route('drawClick', function(req) {
    req.io.broadcast('draw', req.data)
})

app.get('/', function(req, res) {
    res.sendfile(__dirname + '/client.html')
})

//app.get('/', router.renderIndex);
//app.get('/admin', router.renderControlPanel);

app.listen(3000);