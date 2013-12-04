if (typeof define !== 'function') { var define = require('amdefine')(module); }
define(function() {
	function ServerSocket(conn) {
		this._rawConn = conn;
		this._bindEvents();
		this._isConnected = true;
		this._disconnectReason = null;
		this._rawConn.io.emit('appjoinaccept');
	}
	ServerSocket.prototype._bindEvents = function() {
		var self = this;
		this._rawConn.socket.on('appdisconnectrequest', function(reason) {
			reason = (reason || 'clientrequest');
			self.disconnect(reason);
		});
	};
	ServerSocket.prototype.isConnected = function() {
		return this._isConnected;
	};
	ServerSocket.prototype.connect = function() {};
	ServerSocket.prototype.disconnect = function(reason) {
		this._disconnectReason = (reason || 'manual');
		this._isConnected = false;
		this._rawConn.io.emit('appdisconnect', this._disconnectReason);
		this._rawConn.socket.disconnect();
	};
	ServerSocket.prototype.send = function(messageType, message) {
		if(this._isConnected) {
			this._rawConn.io.emit('appmessage', {
				type: messageType,
				message: message
			});
		}
	};
	ServerSocket.prototype.onReceive = function(messageType, context, callback) {
		if(arguments.length === 2) {
			callback = context;
			context = this;
		}
		this._rawConn.socket.on('appmessage', function(message) {
			if(message.type === messageType) {
				callback.call(context, message.message);
			}
		});
	};
	ServerSocket.prototype.whenConnected = function(context, callback) {
		if(arguments.length === 1) {
			callback = context;
			context = this;
		}
		if(this._isConnected) {
			callback.call(context);
		}
	};
	ServerSocket.prototype.whenDisconnected = function(context, callback) {
		var self = this;
		if(arguments.length === 1) {
			callback = context;
			context = this;
		}
		if(!this._isConnected) {
			callback.call(context, this._disconnectReason);
		}
		this._rawConn.socket.on('disconnect', function() {
			callback.call(context, self._disconnectReason);
		});
	};

	return ServerSocket;
});