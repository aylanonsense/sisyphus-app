if (typeof define !== 'function') { var define = require('amdefine')(module); }
define([ 'net/TypelessMessageConnection', 'net/ClientSocket' ], function(TypelessMessageConnection, ClientSocket) {
	var SuperConstructor = TypelessMessageConnection;
	var SuperClass = SuperConstructor.prototype;

	function ClientConnection() {
		SuperConstructor.call(this, new ClientSocket());
	}
	ClientConnection.prototype = Object.create(SuperClass);

	return ClientConnection;
});