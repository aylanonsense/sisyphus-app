if (typeof define !== 'function') { var define = require('amdefine')(module); }
define(function() {
	function firesEvents(extendable) {
		extendable.initializeEvents = function() {
			if(!this._firesEventsCallbacks) {
				this._firesEventsCallbacks = {};
			}
		};
		extendable.fireEvent = function(evt, data) {
			var i, len;
			var callbacks = this._firesEventsCallbacks[evt];
			if(callbacks) {
				for(i = 0, len = callbacks.length; i < len; i++) {
					callbacks[i].call(this, data);
				}
			}
		};
		extendable.onEvent = function(evt, context, callback) {
			if(arguments.length === 2) {
				callback = context;
				context = this;
			}
			if(!this._firesEventsCallbacks[evt]) {
				this._firesEventsCallbacks[evt] = [];
			}
			this._firesEventsCallbacks[evt].push(function(data) {
				callback.call(context, data);
			});
		};
	}
	function hasFlags(extendable) {
		extendable.initializeFlags = function(flags) {
			if(!this._hasFlagsValues) {
				this._hasFlagsValues = {};
			}
			if(!this._hasFlagsCallbacks) {
				this._hasFlagsCallbacks = [];
			}
			if(flags) {
				for(flag in flags) {
					this.setFlag(flag, flags[flag]);
				}
			}
		};
		extendable.getFlag = function(flag) {
			return (this._hasFlagsValues ? this._hasFlagsValues[flag] : undefined);
		};
		extendable.setFlag = function(flag, value) {
			var i, len;
			var oldValue = this._hasFlagsValues[flag];
			var callbacks = this._hasFlagsCallbacks[flag];
			if(oldValue !== value) {
				this._hasFlagsValues[flag] = value;
				if(callbacks) {
					for(i = 0, len = callbacks.length; i < len; i++) {
						callbacks[i].call(this, value, oldValue);
					}
				}
			}
		};
		extendable.whenFlag = function(flag, value, context, callback) {
			if(arguments.length === 3) {
				callback = context;
				context = this;
			}
			if(!this._hasFlagsCallbacks[flag]) {
				this._hasFlagsCallbacks[flag] = [];
			}
			this._hasFlagsCallbacks[flag].push(function(val, oldVal) {
				if(val === value) {
					callback.call(context, val, oldVal);
				}
			});
			if(this._hasFlagsValues[flag] === value) {
				callback.call(context, this._hasFlagsValues[flag], this._hasFlagsValues[flag]);
			}
		};
	}

	return {
		firesEvents: firesEvents,
		hasFlags: hasFlags
	};
});