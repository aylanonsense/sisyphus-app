if (typeof define !== 'function') { var define = require('amdefine')(module); }
define([ 'net/PriorityConnection', 'net/PriorityEnum', 'util/EventState' ], function(PriorityConnection, PRIORITY, EventState) {
	var SuperConstructor = PriorityConnection;
	var SuperClass = SuperConstructor.prototype;

	function PingConnection(socket) {
		SuperConstructor.call(this, socket);
		this._pingConnectionState = new EventState();
		this._timeToDisconnect = 5000;
		this._timeBetweenPings = 1500;
		this._disconnectTimer = null;
		this._pingTimer = null;
		this._mostRecentPingNums = [];
		this._pingIndex = 0;
		this._maxStoredPings = 5;
		this._timeOfOutgoingPings = {};
		this._nextPingId = 0;
		this._avgPingNum = null;
		this._avgPingNumOther = null;
		SuperClass.onReceive.call(this, null, this, function() {
			this._resetDisconnectTimer();
		});
		SuperClass.onReceive.call(this, 'message', this, function(message) {
			this._pingConnectionState.fireEvent('receive', message);
		});
		SuperClass.onReceive.call(this, 'ping', this, function(pingId) {
			SuperClass.send.call(this, 'pingresponse', pingId, PRIORITY.CRITICAL);
		});
		SuperClass.onReceive.call(this, 'pingresponse', this, function(pingId) {
			var pingNum;
			if(this._timeOfOutgoingPings[pingId]) {
				pingNum = Date.now() - this._timeOfOutgoingPings[pingId];
				delete this._timeOfOutgoingPings[pingId];
				this._mostRecentPingNums[this._pingIndex] = pingNum;
				this._pingIndex++;
				if(this._pingIndex >= this._maxStoredPings) {
					this._pingIndex = 0;
				}
				this._avgPingNum = null;
				SuperClass.send.call(this, 'pingresults', this.getPing(), PRIORITY.INSIGNIFICANT);
			}
		});
		SuperClass.onReceive.call(this, 'pingresults', this, function(ping) {
			this._avgPingNumOther = ping;
		});
		this._resetDisconnectTimer();
		this._resetPingTimer();
	}
	PingConnection.prototype = Object.create(SuperClass);
	PingConnection.prototype._resetDisconnectTimer = function() {
		var self = this;
		if(this._disconnectTimer !== null) {
			clearTimeout(this._disconnectTimer);
		}
		this._disconnectTimer = setTimeout(function() {
			self._disconnectTimer = null;
			self.disconnect();
		}, this._timeToDisconnect);
	};
	PingConnection.prototype._resetPingTimer = function() {
		var self = this;
		if(this._pingTimer !== null) {
			clearTimeout(this._pingTimer);
		}
		this._pingTimer = setTimeout(function() {
			self._pingTimer = null;
			self._ping();
		}, this._timeBetweenPings);
	};
	PingConnection.prototype._ping = function() {
		var pingId;
		if(this.isConnected()) {
			pingId = this._nextPingId++;
			this._timeOfOutgoingPings[pingId] = Date.now();
			this._resetPingTimer();
			SuperClass.send.call(this, 'ping', pingId, PRIORITY.CRITICAL);
		}
	};
	PingConnection.prototype.getPing = function() {
		var i, len;
		if(!this.isConnected()) {
			return null;
		}
		if(this._avgPingNum === null) {
			if(this._mostRecentPingNums.length === 0) {
				return this._avgPingNumOther;
			}
			this._avgPingNum = 0;
			for(i = 0, len = this._mostRecentPingNums.length; i < len; i++) {
				this._avgPingNum += this._mostRecentPingNums[i];
			}
			this._avgPingNum = Math.floor(this._avgPingNum / this._mostRecentPingNums.length);
		}
		return this._avgPingNum;
	};
	PingConnection.prototype.send = function(messageType, message, priority) {
		SuperClass.send.call(this, 'message', {
			type: messageType,
			message: message
		}, priority);
	};
	PingConnection.prototype.sendDynamic = function(messageType, messageFunc, priority) {
		var wrappedMessageFunc = function() {
			return {
				type: messageType,
				message: messageFunc.call(this)
			};
		};
		return SuperClass.sendDynamic.call(this, 'message', wrappedMessageFunc, priority);
	};
	PingConnection.prototype.onReceive = function(messageType, context, callback) {
		if(arguments.length === 2) {
			callback = context;
			context = this;
		}
		this._pingConnectionState.onEvent('receive', this, function(message) {
			if(messageType === null || message.type === messageType) {
				callback.call(context, message.message, message.type);
			}
		});
	};

	return PingConnection;
});