if (typeof define !== 'function') { var define = require('amdefine')(module); }
define(function() {
	function BufferedConnection(socket) {
		this._socket = socket;
		this._bufferedMessages = [];
		this._onReceiveCallbacks = [];
		this._onConnectCallbacks = [];
		this._onDisconnectCallbacks = [];
		this._wasEverConnected = socket.isConnected();
		this._disconnectReason = null;
		this._bindSocketEvents();
	}
	BufferedConnection.prototype._bindSocketEvents = function() {
		this._socket.onReceive('messages', this, function(messages) {
			var i, j, len, len2;
			for(i = 0, len = messages.length; i < len; i++) {
				for(j = 0, len2 = this._onReceiveCallbacks.length; j < len2; j++) {
					if(this._onReceiveCallbacks[j].call(this, messages[i]) === true) {
						break;
					}
				}
			}
		});
	};
	BufferedConnection.prototype.send = function(message) {
		this._bufferedMessages.push(message);
	};
	BufferedConnection.prototype.sendAll = function(messages) {
		var i, len;
		for(i = 0, len = messages.length; i < len; i++) {
			this._bufferedMessages.push(messages[i]);
		}
	};
	BufferedConnection.prototype.flush = function() {
		if(this.isConnected()) {
			this._socket.send('messages', this._bufferedMessages);
			this._bufferedMessages = [];
		}
	};
	BufferedConnection.prototype.disconnect = function(reason) {
		if(this.isConnected()) {
			this._disconnectReason = (reason || 'manual');
			this._socket.disconnect();
		}
	};
	BufferedConnection.prototype.isConnected = function() {
		return this._socket.isConnected();
	};
	BufferedConnection.prototype.connect = function() {
		if(!this.isConnected()) {
			this._socket.connect();
		}
	};
	BufferedConnection.prototype.onReceive = function(context, callback) {
		if(arguments.length === 1) {
			callback = context;
			context = this;
		}
		this._onReceiveCallbacks.push(function(message) {
			return callback.call(context, message);
		});
	};
	BufferedConnection.prototype.whenConnected = function(context, callback) {
		if(arguments.length === 1) {
			callback = context;
			context = this;
		}
		this._socket.whenConnected(context, callback);
	};
	BufferedConnection.prototype.whenDisconnected = function(context, callback) {
		if(arguments.length === 1) {
			callback = context;
			context = this;
		}
		this._socket.whenDisconnected(context, callback);
	};

	return BufferedConnection;
});