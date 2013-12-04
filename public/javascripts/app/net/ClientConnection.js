if (typeof define !== 'function') { var define = require('amdefine')(module); }
define([ 'net/TimeoutConnection', 'net/ClientSocket' ], function(TimeoutConnection, ClientSocket) {
	var SuperConstructor = TimeoutConnection;
	var SuperClass = SuperConstructor.prototype;

	function ClientConnection() {
		SuperConstructor.call(this, new ClientSocket());
	}
	ClientConnection.prototype = Object.create(SuperClass);

	return ClientConnection;
});