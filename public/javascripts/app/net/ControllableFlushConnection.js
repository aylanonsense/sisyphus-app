if (typeof define !== 'function') { var define = require('amdefine')(module); }
define([ 'net/DynamicPriorityConnection' ], function(DynamicPriorityConnection) {
	var SuperConstructor = DynamicPriorityConnection;
	var SuperClass = SuperConstructor.prototype;

	function ControllableFlushConnection(socket) {
		SuperConstructor.call(this, socket);
		this._flushingAllowed = true;
		this._flushingQueuedUp = false;
	}
	ControllableFlushConnection.prototype = Object.create(SuperClass);
	ControllableFlushConnection.prototype.flush = function() {
		if(this._flushingAllowed) {
			SuperClass.flush.call(this);
		}
		else {
			this._flushingQueuedUp = true;
		}
	};
	ControllableFlushConnection.prototype.pauseFlushing = function() {
		if(this._flushingAllowed) {
			this._flushingAllowed = false;
			this._flushingQueuedUp = false;
		}
	};
	ControllableFlushConnection.prototype.resumeFlushing = function() {
		if(!this._flushingAllowed) {
			tihs._flushingAllowed = true;
			if(this._flushingQueuedUp) {
				this.flush();
				this._flushingQueuedUp = false;
			}
		}
	};

	return ControllableFlushConnection;
});