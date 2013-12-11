if (typeof define !== 'function') { var define = require('amdefine')(module); }
define([ 'util/EventState' ], function(EventState) {
	function PriorityBuffer() {
		this._flushId = 0;
		this._priorityBufferState = new EventState({
			flushRequired: false
		});
		this._priorities = [];
	}
	PriorityBuffer.prototype.whenFlushRequired = function(context, callback) {
		this._priorityBufferState.whenFlag('flushRequired', true, context, callback);
	};
	PriorityBuffer.prototype.addPriority = function(priority) {
		var self = this;
		var currFlushId = this._flushId;
		var priorityIndex = this._priorities.length;
		this._priorities.push(priority);
		this._determineIfFlushRequired();
		return function(newPriority) {
			if(self._flushId === currFlushId) {
				self._priorities[priorityIndex] = newPriority;
			}
		};
	};
	PriorityBuffer.prototype.flush = function() {
		this._priorities = [];
		this._flushId++;
		this._priorityBufferState.setFlag('flushRequired', false);
	};
	PriorityBuffer.prototype._determineIfFlushRequired = function() {
		//TODO
		this._priorityBufferState.setFlag('flushRequired', true);
	};

	return PriorityBuffer;
});