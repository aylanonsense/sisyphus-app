module.exports = function(app) {
	var requirejs = require('requirejs');
	requirejs.config({
		baseUrl: __dirname,
		paths: {
			app: 'public/javascripts/app',
			net: 'public/javascripts/app/net',
			util: 'public/javascripts/app/util',
			accord: 'public/javascripts/app/accord',
			lib: 'public/javascripts/lib'
		},
		nodeRequire: require
	});
	requirejs([ 'net/ExampleServer' ], function(ExampleServer) {
		var server = new ExampleServer(app);
		server.start();
	});
};