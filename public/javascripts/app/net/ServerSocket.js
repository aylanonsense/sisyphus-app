if (typeof define !== 'function') { var define = require('amdefine')(module); }
define([ 'util/EventState' ], function(EventState) {
	function ServerSocket(conn) {
		var self = this;
		this._rawConn = conn;
		this._serverSocketState = new EventState({
			connected: false,
			disconnected: false
		});
		this._rawConn.socket.on('appmessage', function(message) {
			self._serverSocketState.fireEvent('receive', message);
		});
		this._rawConn.socket.on('appdisconnectrequest', function() {
			self._rawConn.socket.disconnect();
			self._serverSocketState.setFlag('connected', false);
			self._serverSocketState.setFlag('disconnected', true);
		});
	}
	ServerSocket.prototype.connect = function() {
		if(!this.isConnected() && !this.isDisconnected()) {
			this._rawConn.io.emit('appjoinaccept');
			this._serverSocketState.setFlag('connected', true);
		}
	};
	ServerSocket.prototype.isConnected = function() {
		return this._serverSocketState.getFlag('connected');
	};
	ServerSocket.prototype.whenConnected = function(context, callback) {
		this._serverSocketState.whenFlag('connected', true, context, callback);
	};
	ServerSocket.prototype.disconnect = function() {
		if(this.isConnected()) {
			this._rawConn.io.emit('appdisconnect');
			this._rawConn.socket.disconnect();
			this._serverSocketState.setFlag('connected', false);
			this._serverSocketState.setFlag('disconnected', true);
		}
		else if(!this.isDisconnected()) {
			this._rawConn.io.emit('appjoinreject');
			this._rawConn.socket.disconnect();
			this._serverSocketState.setFlag('disconnected', true);
		}
	};
	ServerSocket.prototype.isDisconnected = function() {
		return this._serverSocketState.getFlag('disconnected');
	};
	ServerSocket.prototype.whenDisconnected = function(context, callback) {
		this._serverSocketState.whenFlag('disconnected', true, context, callback);
	};
	ServerSocket.prototype.send = function(messageType, message) {
		if(this.isConnected()) {
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
		this._serverSocketState.onEvent('receive', this, function(message) {
			if(this.isConnected() && (messageType === null || message.type === messageType)) {
				callback.call(context, message.message, message.type);
			}
		});
	};

	return ServerSocket;
});