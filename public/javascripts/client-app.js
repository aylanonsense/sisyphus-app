requirejs.config({
	baseUrl: 'javascripts',
	paths: {
		app: '/javascripts/app',
		net: '/javascripts/app/net',
		util: '/javascripts/app/util',
		lib: '/javascripts/lib'
	}
});

requirejs([ 'net/ExampleClient' ], function(ExampleClient) {
	var client = new ExampleClient();
	client.connect();
});