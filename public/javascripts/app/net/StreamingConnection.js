if (typeof define !== 'function') { var define = require('amdefine')(module); }
define([ 'net/PingConnection', 'net/PriorityEnum', 'util/EventState' ], function(PingConnection, PRIORITY, EventState) {
	var SuperConstructor = PingConnection;
	var SuperClass = SuperConstructor.prototype;

	function StreamingConnection(socket) {
		SuperConstructor.call(this, socket);
	}
	StreamingConnection.prototype = Object.create(SuperClass);
	StreamingConnection.prototype.openStream = function(messageType, messageFunc) {
		var self = this;
		var dynaMessage = null;
		var timeLastSent = null;
		var lastSetPriority = null;
		var isClosed = false;
		return {
			getPriority: function() {
				if(dynaMessage === null || dynaMessage.hasBeenSent()) {
					return null;
				}
				return lastSetPriority;
			},
			setPriority: function(priority) {
				if(!isClosed) {
					lastSetPriority = priority;
					if(dynaMessage === null || dynaMessage.hasBeenSent()) {
						if(dynaMessage !== null) {
							timeLastSent = dynaMessage.timeSent();
						}
						dynaMessage = self.sendDynamic(messageType, messageFunc, priority);
					}
					else {
						dynaMessage.setPriority(priority);
					}
				}
			},
			timeLastSent: function() {
				if(dynaMessage !== null && dynaMessage.hasBeenSent()) {
					return dynaMessage.timeSent();
				}
				return timeLastSent;
			},
			closeStream: function() {
				isClosed = true;
			}
		};
	};

	return StreamingConnection;
});