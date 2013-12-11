requirejs.config({
	baseUrl: 'javascripts',
	paths: {
		app: '/javascripts/app',
		net: '/javascripts/app/net',
		util: '/javascripts/app/util',
		accord: '/javascripts/app/accord',
		lib: '/javascripts/lib'
	}
});

requirejs([ 'net/ExampleClient' ], function(ExampleClient) {
	var client = new ExampleClient();
	client.connect();
});