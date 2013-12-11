if (typeof define !== 'function') { var define = require('amdefine')(module); }
define([ 'net/BasicConnection', 'util/EventState' ], function(BasicConnection, EventState) {
	var SuperConstructor = BasicConnection;
	var SuperClass = SuperConstructor.prototype;

	function BufferedConnection(socket) {
		SuperConstructor.call(this, socket);
		this._bufferedMessages = [];
		this._bufferedConnectionState = new EventState();
		SuperClass.onReceive.call(this, 'messages', this, function(messages) {
			var i, len;
			for(i = 0, len = messages.length; i < len; i++) {
				this._bufferedConnectionState.fireEvent('receive', messages[i]);
			}
		});
	}
	BufferedConnection.prototype = Object.create(SuperClass);
	BufferedConnection.prototype.send = function(messageType, message) {
		this._bufferedMessages.push({
			dynamic: false,
			messageType: messageType,
			message: message
		});
	};
	BufferedConnection.prototype.sendDynamic = function(messageType, context, messageFunc) {
		var timeSent = null;
		if(arguments.length === 2) {
			messageFunc = context;
			context = this;
		}
		this._bufferedMessages.push({
			dynamic: true, 
			messageType: messageType,
			messageFunc: function() {
				return messageFunc.call(context);
			},
			setSentTime: function(time) {
				timeSent = time;
			}
		});
		return {
			hasBeenSent: function() {
				return timeSent !== null;
			},
			timeSent: function() {
				return timeSent;
			}
		};
	};
	BufferedConnection.prototype.flush = function() {
		var i, len, message;
		var messages = [];
		var now = Date.now();
		if(this.isConnected()) {
			for(i = 0, len = this._bufferedMessages.length; i < len; i++) {
				message = this._bufferedMessages[i];
				if(message.dynamic) {
					messages.push({
						type: message.messageType,
						message: message.messageFunc.call(this)
					});
					message.setSentTime(now);
				}
				else {
					messages.push({
						type: message.messageType,
						message: message.message
					});
				}
			}
			this._bufferedMessages = [];
			SuperClass.send.call(this, 'messages', messages);
		}
	};
	BufferedConnection.prototype.onReceive = function(messageType, context, callback) {
		if(arguments.length === 2) {
			callback = context;
			context = this;
		}
		this._bufferedConnectionState.onEvent('receive', this, function(message) {
			if(messageType === null || message.type === messageType) {
				callback.call(context, message.message, message.type);
			}
		});
	};

	return BufferedConnection;
});