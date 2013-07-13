var express = require('express.io');
var lessMiddleware = require('less-middleware');
var config = require('./resources/config.js');
var MongoStore = require('connect-mongo')(express);
var mongoose = require('mongoose');
var router = require('./resources/router.js');
var chat = require('./chat.js');

//set up app
var app = express();
app.http().io();

mongoose.connect(config.db.uri);

app.use(lessMiddleware({ src: __dirname + "/public", compress : true }));
app.use(express.bodyParser());
app.use(express.static(__dirname + '/public'));
app.use(express.cookieParser());
app.use(express.session({
	store: new MongoStore({
		url: config.db.uri
	}),
	secret: config.session.secret
}));

app.io.route('chat-join', chat.onJoin);

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

app.get('/', router.renderIndex);

app.listen(process.env.PORT || 3000);