if (typeof define !== 'function') { var define = require('amdefine')(module); }
define([ 'net/BufferedConnection', 'net/PriorityBuffer' ], function(BufferedConnection, PriorityBuffer) {
	var SuperConstructor = BufferedConnection;
	var SuperClass = SuperConstructor.prototype;

	function PriorityConnection(socket) {
		SuperConstructor.call(this, socket);
		this._buffer = new PriorityBuffer();
		this._automaticFlushRequired = false;
		this._allowedToFlushAutomatically = true;
		this._buffer.whenFlushRequired(this, function() {
			if(this._allowedToFlushAutomatically) {
				this.flush();
			}
			else {
				this._automaticFlushRequired = true;
			}
		});
	}
	PriorityConnection.prototype = Object.create(SuperClass);
	PriorityConnection.prototype.send = function(messageType, message, priority) {
		SuperClass.send.call(this, messageType, message);
		this._buffer.addPriority(priority);
	};
	PriorityConnection.prototype.sendDynamic = function(messageType, messageFunc, priority) {
		var self = this;
		var lastSetPriority = null;
		var changePriorityFunc = null;
		var dynaMessage = SuperClass.sendDynamic.call(this, messageType, messageFunc);
		dynaMessage.getPriority = function() {
			return lastSetPriority;
		};
		dynaMessage.setPriority = function(newPriority) {
			if(changePriorityFunc === null) {
				changePriorityFunc = self._buffer.addPriority(newPriority);
			}
			else {
				changePriorityFunc.call(this, newPriority);
			}
			lastSetPriority = newPriority;
		};
		if(priority) {
			dynaMessage.setPriority(priority);
		}
		return dynaMessage;
	};
	PriorityConnection.prototype.flush = function() {
		this._automaticFlushRequired = false;
		SuperClass.flush.call(this);
		this._buffer.flush();
	};
	PriorityConnection.prototype.pauseFlushing = function() {
		this._allowedToFlushAutomatically = false;
	};
	PriorityConnection.prototype.resumeFlushing = function() {
		this._allowedToFlushAutomatically = true;
		if(this._automaticFlushRequired) {
			this.flush();
		}
	};

	return PriorityConnection;
});