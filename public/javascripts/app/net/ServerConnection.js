if (typeof define !== 'function') { var define = require('amdefine')(module); }
define([ 'net/TypelessMessageConnection', 'net/ServerSocket' ], function(TypelessMessageConnection, ServerSocket) {
	var SuperConstructor = TypelessMessageConnection;
	var SuperClass = SuperConstructor.prototype;

	function ServerConnection(rawSocket) {
		SuperConstructor.call(this, new ServerSocket(rawSocket));
	}
	ServerConnection.prototype = Object.create(SuperClass);

	return ServerConnection;
});