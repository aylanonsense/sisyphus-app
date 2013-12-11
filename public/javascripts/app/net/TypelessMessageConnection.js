if (typeof define !== 'function') { var define = require('amdefine')(module); }
define([ 'net/StreamingConnection' ], function(StreamingConnection) {
	var SuperConstructor = StreamingConnection;
	var SuperClass = SuperConstructor.prototype;

	function TypelessMessageConnection(socket) {
		SuperConstructor.call(this, socket);
	}
	TypelessMessageConnection.prototype = Object.create(SuperClass);
	TypelessMessageConnection.prototype.send = function(message, priority) {
		SuperClass.send.call(this, 'message', message, priority);
	};
	TypelessMessageConnection.prototype.sendDynamic = function(context, messageFunc, priority) {
		SuperClass.sendDynamic.call(this, 'message', context, messageFunc, priority);
	};
	TypelessMessageConnection.prototype.openStream = function(context, messageFunc) {
		return SuperClass.openStream.call(this, 'message', context, messageFunc);
	};
	TypelessMessageConnection.prototype.onReceive = function(context, callback) {
		SuperClass.onReceive.call(this, 'message', context, callback);
	};

	return TypelessMessageConnection;
});