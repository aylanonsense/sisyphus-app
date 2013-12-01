requirejs.config({
	baseUrl: 'javascripts',
	paths: {
		app: '/app',
		lib: '/lib'
	}
});

requirejs(['gamecommon'], function(gamecommon) {
	requirejs(['gameclient'], function(gameclient) {
		
	});
});