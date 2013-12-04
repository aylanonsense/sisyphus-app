var express = require('express.io');
var lessMiddleware = require('less-middleware');
var config = require('./config/config');
var router = require('./router');

var app = express();
app.http().io();

app.use(lessMiddleware({ src: __dirname + "/public", compress : true }));
app.use(express.bodyParser());
app.use(express.static(__dirname + '/public'));

app.get('/', router.renderIndex);
app.listen(config.server.port);

require('./server-app')(app);