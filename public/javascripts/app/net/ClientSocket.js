if (typeof define !== 'function') { var define = require('amdefine')(module); }
define(function() {
	function ClientSocket() {
		this._rawConn = io.connect();
		this._onConnectedCallbacks = [];
		this._isAttemptingToConnect = false;
		this._hasEverConnected = false;
		this._isConnected = false;
		this._disconnectReason = null;
		this._bindEvents();
	}
	ClientSocket.prototype._bindEvents = function() {
		var self = this;
		this._rawConn.on('appjoinaccept', function() {
			if(self._isAttemptingToConnect && !self._isConnected) {
				self._isAttemptingToConnect = false;
				self._isConnected = true;
				self._hasEverConnected = true;
				self._fireConnectEvent();
			}
		});
		this._rawConn.on('appdisconnect', function(reason) {
			self._disconnectReason = reason;
		});
		this.whenDisconnected(this, function() {
			this._isConnected = false;
		});
	};
	ClientSocket.prototype._fireConnectEvent = function() {
		var i, len;
		for(i = 0, len = this._onConnectedCallbacks.length; i < len; i++) {
			this._onConnectedCallbacks[i].call(this);
		}
	};
	ClientSocket.prototype.isConnected = function() {
		return this._isConnected;
	};
	ClientSocket.prototype.connect = function() {
		if(!this._isAttemptingToConnect && !this._isConnected) {
			this._isAttemptingToConnect = true;
			this._rawConn.emit('appjoinrequest');
		}
	};
	ClientSocket.prototype.disconnect = function(reason) {
		reason = (reason || 'clientrequest');
		if(this._isConnected) {
			this._rawConn.emit('appdisconnectrequest', reason);
		}
	};
	ClientSocket.prototype.send = function(messageType, message) {
		this._rawConn.emit('appmessage', {
			type: messageType,
			message: message
		});
	};
	ClientSocket.prototype.onReceive = function(messageType, context, callback) {
		if(arguments.length === 2) {
			callback = context;
			context = this;
		}
		this._rawConn.on('appmessage', function(message) {
			if(message.type === messageType) {
				callback.call(context, message.message);
			}
		});
	};
	ClientSocket.prototype.whenConnected = function(context, callback) {
		if(arguments.length === 1) {
			callback = context;
			context = this;
		}
		this._onConnectedCallbacks.push(function() {
			callback.call(context);
		});
		if(this._isConnected) {
			callback.call(context);
		}
	};
	ClientSocket.prototype.whenDisconnected = function(context, callback) {
		var self = this;
		if(arguments.length === 1) {
			callback = context;
			context = this;
		}
		this._rawConn.on('disconnect', function() {
			callback.call(context, self._disconnectReason);
		});
		if(this._hasEverConnected && !this._isConnected) {
			callback.call(context, this._disconnectReason);
		}
	};

	return ClientSocket;
});