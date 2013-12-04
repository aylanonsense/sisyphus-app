if (typeof define !== 'function') { var define = require('amdefine')(module); }
define([ 'net/TimeoutConnection', 'net/ServerSocket' ], function(TimeoutConnection, ServerSocket) {
	var SuperConstructor = TimeoutConnection;
	var SuperClass = SuperConstructor.prototype;

	function ServerConnection(rawConn) {
		SuperConstructor.call(this, new ServerSocket(rawConn));
	}
	ServerConnection.prototype = Object.create(SuperClass);

	return ServerConnection;
});