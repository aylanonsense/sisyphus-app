if (typeof define !== 'function') { var define = require('amdefine')(module); }
define(function() {
	function BasicConnection(socket) {
		this._socket = socket;
	}
	BasicConnection.prototype.connect = function() {
		this._socket.connect();
	};
	BasicConnection.prototype.isConnected = function() {
		return this._socket.isConnected();
	};
	BasicConnection.prototype.whenConnected = function(context, callback) {
		this._socket.whenConnected(context, callback);
	};
	BasicConnection.prototype.disconnect = function() {
		this._socket.disconnect();
	};
	BasicConnection.prototype.isDisconnected = function() {
		return this._socket.isDisconnected();
	};
	BasicConnection.prototype.whenDisconnected = function(context, callback) {
		this._socket.whenDisconnected(context, callback);
	};
	BasicConnection.prototype.send = function(messageType, message) {
		this._socket.send(messageType, message);
	};
	BasicConnection.prototype.onReceive = function(messageType, context, callback) {
		this._socket.onReceive(messageType, context, callback);
	};

	return BasicConnection;
});