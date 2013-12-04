module.exports = function(app) {
	var requirejs = require('requirejs');
	requirejs.config({
		baseUrl: __dirname,
		paths: {
			app: 'public/javascripts/app',
			net: 'public/javascripts/app/net',
			lib: 'public/javascripts/lib'
		},
		nodeRequire: require
	});
	requirejs([ 'net/ExampleServer' ], function(ExampleServer) {
		var server = new ExampleServer(app);
		server.start();
	});
};