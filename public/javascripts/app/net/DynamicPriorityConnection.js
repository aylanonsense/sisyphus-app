if (typeof define !== 'function') { var define = require('amdefine')(module); }
define([ 'net/PriorityConnection', 'net/PriorityEnum' ], function(PriorityConnection, PRIORITY) {
	var SuperConstructor = PriorityConnection;
	var SuperClass = SuperConstructor.prototype;

	function DynamicPriorityConnection(socket) {
		SuperConstructor.call(this, socket);
		this._dynamicMessages = [];
	}
	DynamicPriorityConnection.prototype = Object.create(SuperClass);
	DynamicPriorityConnection.prototype.sendDynamic = function(messageFunc, priority) {
		var dynamicMessage = new DynamicMessage(this, messageFunc, priority);
		var index;
		this._dynamicMessages.push(dynamicMessage);
		index = this._buffer.add(priority);
		dynamicMessage.setPriorityIndex(index);
		return {
			getPriority: function() {
				return dynamicMessage.getPriority();
			},
			upgradePriority: function(priority) {
				dynamicMessage.upgradePriority(priority);
			},
			hasBeenSent: function() {
				return dynamicMessage.hasBeenSent();
			},
			whenSent: function(context, callback) {
				dynamicMessage.whenSent(context, callback);
			}
		};
	};
	DynamicPriorityConnection.prototype.upgradePriority = function(index, priority) {
		this._buffer.change(index, priority);
	};
	DynamicPriorityConnection.prototype.flush = function() {
		var i, len, message, dynamicMessages;
		for(i = 0, len = this._dynamicMessages.length; i < len; i++) {
			message = this._dynamicMessages[i];
			this._bufferedMessages.push(message.getMessage());
		}
		dynamicMessages = this._dynamicMessages;
		this._dynamicMessages = [];
		SuperClass.flush.call(this);
		for(i = 0, len = dynamicMessages.length; i < len; i++) {
			dynamicMessages[i].markAsSent();
		}
	};

	function DynamicMessage(conn, messageFunc, priority) {
		this._conn = conn;
		this._hasBeenSent = false;
		this._whenSentCallbacks = [];
		this._priority = priority;
		this._messageFunc = messageFunc;
		this._priorityIndex = null;
	}
	DynamicMessage.prototype.getPriority = function() {
		return this._priority;
	};
	DynamicMessage.prototype.getMessage = function() {
		return this._messageFunc.call(this);
	};
	DynamicMessage.prototype.setPriorityIndex = function(index) {
		this._priorityIndex = index;
	};
	DynamicMessage.prototype.upgradePriority = function(priority) {
		if(!this._hasBeenSent && priority > this._priority) {
			this._priority = priority;
			this._conn.upgradePriority(this._priorityIndex, priority);
		}
	};
	DynamicMessage.prototype.hasBeenSent = function() {
		return this._hasBeenSent;
	};
	DynamicMessage.prototype.markAsSent = function() {
		var i, len;
		if(!this._hasBeenSent) {
			this._hasBeenSent = true;
			for(i = 0, len = this._whenSentCallbacks.length; i < len; i++) {
				this._whenSentCallbacks[i].call(this);
			}
		}
	};
	DynamicMessage.prototype.whenSent = function(context, callback) {
		if(arguments.length === 1) {
			callback = context;
			context = this;
		}
		if(this._hasBeenSent) {
			callback.call(context);
		}
		else {
			this._whenSentCallbacks.push(function() {
				callback.call(context);
			});
		}
	};

	return DynamicPriorityConnection;
});