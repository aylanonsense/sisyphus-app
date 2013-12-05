if (typeof define !== 'function') { var define = require('amdefine')(module); }
define([ 'net/DynamicPriorityConnection' ], function(DynamicPriorityConnection) {
	var SuperConstructor = DynamicPriorityConnection;
	var SuperClass = SuperConstructor.prototype;

	function PreFlushConnection(socket) {
		SuperConstructor.call(this, socket);
		this._isFlushing = false;
		this._preFlushCallbacks = [];
	}
	PreFlushConnection.prototype = Object.create(SuperClass);
	PreFlushConnection.prototype.flush = function() {
		var i, len;
		if(!this._isFlushing) {
			this._isFlushing = true;
			for(i = 0, len = this._preFlushCallbacks.length; i < len; i++) {
				this._preFlushCallbacks[i].call(this);
			}
			SuperClass.flush.call(this);
			this._isFlushing = false;
			return true;
		}
		return false;
	};
	PreFlushConnection.prototype.preFlush = function(context, callback) {
		if(arguments.length === 1) {
			callback = context;
			context = this;
		}
		this._preFlushCallbacks.push(function() {
			callback.call(context);
		});
	};

	return PreFlushConnection;
});