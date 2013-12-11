if (typeof define !== 'function') { var define = require('amdefine')(module); }
define([ 'util/EventState' ], function(EventState) {
	function ClientSocket(conn) {
		var self = this;
		this._rawConn = io.connect();
		this._clientSocketState = new EventState({
			connected: false,
			attemptingToConnect: false,
			disconnected: false
		});
		this._rawConn.on('appjoinaccept', function() {
			if(self._isAttemptingToConnect()) {
				self._clientSocketState.setFlag('disconnected', false);
				self._clientSocketState.setFlag('attemptingToConnect', false);
				self._clientSocketState.setFlag('connected', true);
			}
		});
		this._rawConn.on('appjoinreject', function() {
			if(self._isAttemptingToConnect()) {
				self._clientSocketState.setFlag('connected', false);
				self._clientSocketState.setFlag('attemptingToConnect', false);
				self._clientSocketState.setFlag('disconnected', true);
			}
		});
		this._rawConn.on('appdisconnect', function() {
			self._clientSocketState.setFlag('connected', false);
			self._clientSocketState.setFlag('attemptingToConnect', false);
			self._clientSocketState.setFlag('disconnected', true);
		});
		this._rawConn.on('appmessage', function(message) {
			self._clientSocketState.fireEvent('receive', message);
		});
	}
	ClientSocket.prototype.connect = function() {
		if(!this._isAttemptingToConnect() && !this.isConnected() && !this.isDisconnected()) {
			this._rawConn.emit('appjoinrequest');
			this._clientSocketState.setFlag('attemptingToConnect', true);
		}
	};
	ClientSocket.prototype._isAttemptingToConnect = function() {
		return this._clientSocketState.getFlag('attemptingToConnect');
	};
	ClientSocket.prototype.isConnected = function() {
		return this._clientSocketState.getFlag('connected');
	};
	ClientSocket.prototype.whenConnected = function(context, callback) {
		this._clientSocketState.whenFlag('connected', true, context, callback);
	};
	ClientSocket.prototype.disconnect = function() {
		if(!this.isDisconnected()) {
			this._rawConn.emit('appdisconnectrequest');
			this._clientSocketState.setFlag('connected', false);
			this._clientSocketState.setFlag('disconnected', true);
		}
	};
	ClientSocket.prototype.isDisconnected = function() {
		return this._clientSocketState.getFlag('disconnected');
	};
	ClientSocket.prototype.whenDisconnected = function(context, callback) {
		this._clientSocketState.whenFlag('disconnected', true, context, callback);
	};
	ClientSocket.prototype.send = function(messageType, message) {
		if(this.isConnected()) {
			this._rawConn.emit('appmessage', {
				type: messageType,
				message: message
			});
		}
	};
	ClientSocket.prototype.onReceive = function(messageType, context, callback) {
		if(arguments.length === 2) {
			callback = context;
			context = this;
		}
		this._clientSocketState.onEvent('receive', this, function(message) {
			if(this.isConnected() && (messageType === null || message.type === messageType)) {
				callback.call(context, message.message, message.type);
			}
		});
	};

	return ClientSocket;
});