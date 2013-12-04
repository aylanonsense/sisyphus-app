if (typeof define !== 'function') { var define = require('amdefine')(module); }
define(function() {
	function PriorityBuffer() {
		this._arr = [];
		this._callbacks = [];
		this._maxTimeBetweenFlushes = 2000;
		this._maxTimeBetweenFlushesTimer = null;
		this._resetMaxTimeBetweenFlushesTimer();
	}
	PriorityBuffer.prototype._resetMaxTimeBetweenFlushesTimer = function() {
		var self = this;
		if(this._maxTimeBetweenFlushesTimer !== null) {
			clearTimeout(this._maxTimeBetweenFlushesTimer);
		}
		this._maxTimeBetweenFlushesTimer = setTimeout(function() {
			self._maxTimeBetweenFlushesTimer = null;
			self._fireFlushRequiredEvent();
		}, this._maxTimeBetweenFlushes);
	};
	PriorityBuffer.prototype.add = function(priority) {
		this._arr.push(priority);
		this._determineIfFlushRequired();
	};
	PriorityBuffer.prototype.addAll = function(priorities) {
		var i, len;
		for(i = 0, len = priorities.length; i < len && !this._hasBeenFlushed; i++) {
			this._arr.push(priorities[i]);
		}
		this._determineIfFlushRequired();
	};
	PriorityBuffer.prototype.flush = function() {
		this._arr = [];
		this._resetMaxTimeBetweenFlushesTimer();
	};
	PriorityBuffer.prototype.onFlushRequired = function(context, callback) {
		if(arguments.length === 1) {
			callback = context;
			context = this;
		}
		this._callbacks.push(function() {
			callback.call(context);
		});
	};
	PriorityBuffer.prototype._fireFlushRequiredEvent = function() {
		for(var i = 0, len = this._callbacks.length; i < len; i++) {
			this._callbacks[i].call(this);
		}
	};
	PriorityBuffer.prototype._determineIfFlushRequired = function() {
		//TODO
		this._fireFlushRequiredEvent();
	};

	return PriorityBuffer;
});