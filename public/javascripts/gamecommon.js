var GameLib = (function() {
	function Connection(params) {
		var self = this;

		//flush vars
		var maxMessagesSentPerSecond = (params.maxMessagesSentPerSecond || 10);
		this._flushInterval = Math.floor(1000 / maxMessagesSentPerSecond);
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
			if(nextFlushTime <= now) {
				this.flush();
			}
			else {
				this._flushTimer = setTimeout(function() {
					self._flushTimer = null;
					self.flush();
				}, Math.max(10, nextFlushTime - now));
			}
		}
	};
	Connection.prototype.flush = function() {
		if(this._unsentMessages.length > 0) {
			var now = Date.now();
			this._socket.emit('GAME_MESSAGES', this._unsentMessages);
			this._unsentMessages = [];
			this._flushHistory.push(now);
			this._cleanFlushHistory(now);
		}
	};
	Connection.prototype._getNextAvailableFlushTime = function(now) {
		if(this._flushHistory.length === 0) {
			return now;
		}
		return Math.max(now, this._flushHistory[this._flushHistory.length - 1] + this._flushInterval);
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
			console.log("messages: " + messages.length);
			messages.forEach(callback);
		});
	};
	Connection.prototype.onDisconnect = function(callback) {
		this._socket.on('disconnect', callback);
	};



	return {
		Connection: Connection
	};
})();

if(typeof module !== "undefined" && typeof module.exports !== "undefined") {
	module.exports = GameLib;
}