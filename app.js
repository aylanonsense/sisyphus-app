var express = require('express.io');
var fs = require('fs');
var lessMiddleware = require('less-middleware');
var MongoStore = require('connect-mongo')(express);
var mongoose = require('mongoose');
var config = require('./config/config');
var router = require('./router');
var chat = require('./chat');
var models = require('./models');
var app;

app = express();
app.http().io();

mongoose.connect(config.db.uri);

app.use(lessMiddleware({ src: __dirname + "/public", compress : true }));
app.use(express.bodyParser());
app.use(express.static(__dirname + '/public'));
app.use(express.cookieParser());
app.use(express.session({
	store: new MongoStore({ url: config.db.uri }),
	secret: config.session.secret
}));

app.io.route('chat-join', chat.onJoin);
app.get('/', router.renderIndex);

app.listen(config.server.port);

exports.app = app;

/*
var https = require('https');
var secureApp;
secureApp = express();
https.createServer({
	key: fs.readFileSync('config/ssl.key').toString(),
	cert: fs.readFileSync('config/ssl.cert').toString()
}, secureApp).listen(config.server.securePort);
secureApp.get('/', function(req, res) {
	res.send('hello!');
});
exports.secureApp = secureApp;
*/

/*app.get('/api/items', api.getItems);
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
//app.get('/admin', router.renderControlPanel);*/