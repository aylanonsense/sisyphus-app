if (typeof define !== 'function') { var define = require('amdefine')(module); }
define([ 'net/ControllableFlushConnection', 'net/PriorityEnum' ], function(ControllableFlushConnection, PRIORITY) {
	var SuperConstructor = ControllableFlushConnection;
	var SuperClass = SuperConstructor.prototype;

	function TimeoutConnection(socket) {
		SuperConstructor.call(this, socket);
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
		this._bindReceiveEvents();
		this._resetDisconnectTimer();
		this._resetPingTimer();
	}
	TimeoutConnection.prototype = Object.create(SuperClass);
	TimeoutConnection.prototype._bindReceiveEvents = function() {
		var pingNum;
		var self = this;
		this.onReceive(function(message) {
			self._resetDisconnectTimer();
			if(message.type === 'ping') {
				self.send({
					type: 'pingresponse',
					pingId: message.pingId
				}, PRIORITY.CRITICAL);
				return true;
			}
			else if(message.type === 'pingresponse') {
				if(self._timeOfOutgoingPings[message.pingId]) {
					pingNum = Date.now() - self._timeOfOutgoingPings[message.pingId];
					self._mostRecentPingNums[self._pingIndex] = pingNum;
					self._pingIndex++;
					if(self._pingIndex >= self._maxStoredPings) {
						self._pingIndex = 0;
					}
					self._avgPingNum = null;
					self.send({
						type: 'pingresults',
						pingId: message.pingId,
						ping: self.getPing()
					}, PRIORITY.INSIGNIFICANT);
				}
				return true;
			}
			else if(message.type === 'pingresults') {
				self._avgPingNumOther = message.ping;
				return true;
			}
			return false;
		});
	};
	TimeoutConnection.prototype._resetDisconnectTimer = function() {
		var self = this;
		if(this._disconnectTimer !== null) {
			clearTimeout(this._disconnectTimer);
		}
		this._disconnectTimer = setTimeout(function() {
			self._disconnectTimer = null;
			if(self.isConnected()) {
				self.disconnect('timeout');
			}
		}, this._timeToDisconnect);
	};
	TimeoutConnection.prototype._resetPingTimer = function() {
		var self = this;
		if(this._pingTimer !== null) {
			clearTimeout(this._pingTimer);
		}
		this._pingTimer = setTimeout(function() {
			self._pingTimer = null;
			self._ping();
		}, this._timeBetweenPings);
	};
	TimeoutConnection.prototype._ping = function() {
		var pingId;
		if(this.isConnected()) {
			pingId = this._nextPingId++;
			this.send({
				type: 'ping',
				pingId: pingId
			}, PRIORITY.CRITICAL);
			this._timeOfOutgoingPings[pingId] = Date.now();
			this._resetPingTimer();
		}
	};
	TimeoutConnection.prototype.getPing = function() {
		var i, len;
		if(!this.isConnected) {
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

	return TimeoutConnection;
});