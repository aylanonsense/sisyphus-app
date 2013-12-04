if (typeof define !== 'function') { var define = require('amdefine')(module); }
define([ 'net/BufferedConnection', 'net/PriorityBuffer' ], function(BufferedConnection, PriorityBuffer) {
	var SuperConstructor = BufferedConnection;
	var SuperClass = SuperConstructor.prototype;

	function PriorityConnection(socket) {
		SuperConstructor.call(this, socket);
		this._buffer = new PriorityBuffer();
		this._bindPriorityBufferEvents();
	}
	PriorityConnection.prototype = Object.create(SuperClass);
	PriorityConnection.prototype._bindPriorityBufferEvents = function() {
		this._buffer.onFlushRequired(this, function() {
			this.flush();
		});
	};
	PriorityConnection.prototype.send = function(message, priority) {
		SuperClass.send.call(this, message);
		this._buffer.add(priority);
	};
	PriorityConnection.prototype.sendAll = function(messages, priorities) {
		SuperClass.sendAll.call(this, messages);
		this._buffer.addAll(priorities);
	};
	PriorityConnection.prototype.flush = function() {
		this._buffer.flush();
		SuperClass.flush.call(this);
	};

	return PriorityConnection;
});