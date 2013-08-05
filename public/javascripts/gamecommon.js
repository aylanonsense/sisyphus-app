var GameLib = (function() {
	function Connection(params) {
		var self = this;

		//flush vars
		this._maxDelayBeforeSending = (params.maxDelayBeforeSending || 250);
		this._maxMessagesPer1000ms = (params.maxMessagesPerSecond || 10);
		this._maxMessagesPer500ms = Math.ceil(this._maxMessagesPer1000ms * 0.67);
		this._maxMessagesPer250ms = Math.ceil(this._maxMessagesPer1000ms * 0.50);
		this._flushHistory = [];
		this._unsentMessages = [];
		this._flushTimer = null;

		//ping vars
		this._pings = [];
		this._lastPingId = null;
		this._lastPingTime = null;
		this._nextPingId = 0;

		//socket
		this._socket = params.socket;
		this._socket.on('PING_REQUEST', function(message) {
			self._lastPingId = message.id;
			self._lastPingTime = Date.now();
			self._socket.emit('PING', { id: id, ping: self.getPing() });
		});
		this._socket.on('PING', function(message) {
			if(self._lastPingId === message.id) {
				self._pings.push(Date.now() - self._lastPingTime);
				if(self._pings.length > 4) {
					self._pings.shift();
				}
			}
			self._socket.emit('PING_RESPONSE', { id: message.id, ping: self.getPing() });
		});
		this._socket.on('PING_RESPONSE', function(message) {
			if(self._lastPingId === message.id) {
				self._pings.push(Date.now() - self._lastPingTime);
				if(self._pings.length > 4) {
					self._pings.shift();
				}
			}
		});
	}
	Connection.prototype.getPing = function() {
		switch(this._pings.length) {
			case 1: return Math.floor(1.00 * this._pings[0]);
			case 2: return Math.floor(0.67 * this._pings[1] + 0.33 * this._pings[0]);
			case 3: return Math.floor(0.54 * this._pings[2] + 0.27 * this._pings[1] + 0.19 * this._pings[0]);
			case 4: return Math.floor(0.50 * this._pings[3] + 0.25 * this._pings[2] + 0.15 * this._pings[1] + 0.10 * this._pings[0]);
		}
		return 0;
	};
	Connection.prototype.ping = function() {
		this._lastPingId = this._nextPingId++;
		this._lastPingTime = Date.now();
		this._socket.emit('PING_REQUEST', { id: this._lastPingId });
	};
	Connection.prototype.send = function(message) {
		this._unsentMessages.push(message);
		this._considerFlushing();
	};
	Connection.prototype._considerFlushing = function() {
		if(this._flushTimer === null) {
			var self = this;
			var now = Date.now();
			var nextFlushTime = this._getNextAvailableFlushTime(now);
			if(nextFlushTime > now + this._maxDelayBeforeSending) {
				nextFlushTime = now + this._maxDelayBeforeSending;
			}
			if(nextFlushTime <= now) {
				this._flush();
			}
			else {
				this._flushTimer = setTimeout(function() {
					self._flushTimer = null;
					self._flush();
				}, Math.max(10, nextFlushTime - now));
			}
		}
	};
	Connection.prototype._flush = function() {
		var now = Date.now();
		self._socket.send('GAME_MESSAGES', this._unsentMessages);
		this._unsentMessages = [];
		this._flushHistory.push(now);
		this._cleanFlushHistory(now);
	};
	Connection.prototype._getNextAvailableFlushTime = function(now) {
		var numFlushesInLast250ms = 0;
		var numFlushesInLast500ms = 0;
		var numFlushesInLast1000ms = 0;
		var flushTimeToAvoid250msRestriction = null;
		var flushTimeToAvoid500msRestriction = null;
		var flushTimeToAvoid1000msRestriction = null;`
		for(var i = this._flushHistory.length - 1; i >= 0; i--) {
			if(this._flushHistory[i] + 250 > now) {
				numFlushesInLast250ms += 1;
				if(numFlushesInLast250ms >= this._maxMessagesPer250ms &&
					flushTimeToAvoid250msRestriction === null) {
					flushTimeToAvoid250msRestriction = this._flushHistory[i] + 250;
				}
			}
			if(this._flushHistory[i] + 500 > now) {
				numFlushesInLast500ms += 1;
				if(numFlushesInLast500ms >= this._maxMessagesPer500ms &&
					flushTimeToAvoid500msRestriction === null) {
					flushTimeToAvoid500msRestriction = this._flushHistory[i] + 500;
				}
			}
			if(this._flushHistory[i] + 1000 > now) {
				numFlushesInLast1000ms += 1;
				if(numFlushesInLast1000ms >= this._maxMessagesPer1000ms &&
					flushTimeToAvoid1000msRestriction === null) {
					flushTimeToAvoid1000msRestriction = this._flushHistory[i] + 1000;
				}
			}
		}
		return Math.max(now,
			flushTimeToAvoid250msRestriction,
			flushTimeToAvoid500msRestriction,
			flushTimeToAvoid1000msRestriction);
	};
	Connection.prototype._cleanFlushHistory = function(now) {
		for(var i = 0; i < this._flushHistory.length; i++) {
			if(this._flushHistory[i] + 1000 > now) {
				if(i > 0) {
					this._flushHistory.splice(0, i);
				}
				break;
			}
		}
	};
	Connection.prototype.onReceive = function(callback) {
		this._socket.on('GAME_MESSAGES', function(messages) {
			messages.forEach(callback);
		});
	};



	return {
		Connection: Connection
	};
})();

if(typeof module !== "undefined" && typeof module.exports !== "undefined") {
	module.exports = GameLib;
}