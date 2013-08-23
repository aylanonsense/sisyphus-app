var GameCommon = (function() {
/*
	GamePlayer
		update(ms)
		handleDelta(delta, source, time)
		getTime()
		gitSplitSecondTime()
		getState()
		setStateAndTime(state, time);
	Game
		update(ms)
		applyDelta(delta)
		getState()
		setState(state)
	GameEntity
		getId()
		update(ms)
		setDir(horizontal, vertical)
		getState()
		setState(state)
	Connection
		getPing()
		ping()
		send(message)
		flush()
		onReceive()
		onDisconnect()
		simulateIncomingLag(minLag, maxLag, chanceOfSpike)
	DelayCalculator
		addDelay(delay)
		getDelay()
*/

	function GamePlayer(params) {
		this._gameTime = 0;
		this._game = new Game();
		this._maxRewind = (params.maxRewind || 0);
		this._deltaHistory = [];
		this._stateHistory = [];
		this._startingState = this._game.getState();
		this._startingTime = this._gameTIme;
		this._earliestDeltaTime = null;
		this._stateStorageFreq = (params.stateStorageFreq || 250);
		this._timeToStateStorage = this._stateStorageFreq;
		this._timeOfLastUpdate = null;
		this._pauseTimeRemaining = 0;
		this._timeUntilSpeedReverts = 0;
		this._timeMultiplier = 1.00;
		this._timeOfLastNow = null;
		this._gameTimeOfLastNow = null;
	}
	GamePlayer.prototype.update = function(ms) {
		if(this._timeUntilSpeedReverts > 0) {
			if(this._timeUntilSpeedReverts > ms) {
				this._timeUntilSpeedReverts -= ms;
				ms *= this._timeMultiplier;
			}
			else {
				ms = this._timeUntilSpeedReverts * this._timeMultiplier + (ms - this._timeUntilSpeedReverts);
				this._timeUntilSpeedReverts = 0;
				this._setSpeed(1.00);
			}
		}
		ms *= this._timeMultiplier;
		if(this._pauseTimeRemaining > 0) {
			if(this._pauseTimeRemaining > ms) {
				this._pauseTimeRemaining -= ms;
				ms = 0;
			}
			else {
				ms -= this._pauseTimeRemaining;
				this._pauseTimeRemaining = 0;
			}
		}
		else if(this._pauseTimeRemaining === -1) {
			ms = 0;
		}
		var startTime = this._gameTime;
		var endTime = this._gameTime + ms;
		if(this._earliestDeltaTime !== null && this._earliestDeltaTime < startTime) {
			startTime = this._rewind(this._earliestDeltaTime);
		}
		var deltas = this._getDeltasBetween(startTime, endTime);
		var currTime = startTime;
		for(var i = 0; i < deltas.length; i++) {
			this._game.update(deltas[i].time - currTime);
			currTime = deltas[i].time;
			this._game.applyDelta(deltas[i].delta);
		}
		this._game.update(endTime - currTime);
		this._gameTime = endTime;
		this._removeDeltasBefore(endTime - this._maxRewind);
		this._timeToStateStorage -= ms;
		if(this._timeToStateStorage <= 0) {
			this._timeToStateStorage += this._stateStorageFreq;
			if(this._timeToStateStorage < 0) {
				this._timeToStateStorage = 0;
			}
			this._stateHistory.push({
				state: this._game.getState(),
				time: this._gameTime
			});
		}
		this._earliestDeltaTime = null;
		this._timeOfLastUpdate = Date.now();
		this._timeOfLastNow = this._timeOfLastUpdate;
		this._gameTimeOfLastNow = this._gameTime;
	};
	GamePlayer.prototype._rewind = function(time) {
		for(var i = this._stateHistory.length - 1; i >= 0; i--) {
			if(this._stateHistory[i].time <= time) {
				this._stateHistory.splice(i + 1, this._stateHistory.length - i - 1);
				this._game.setState(this._stateHistory[i].state);
				return this._stateHistory[i].time;
			}
		}
		this._game.setState(this._startingState);
		return this._startingTime;
	};
	GamePlayer.prototype.handleDelta = function(delta, source, time) {
		if(typeof time === "undefined") {
			time = this.getSplitSecondTime();
		}
		var addedDelta = false;
		for(var i = 0; i < this._deltaHistory.length; i++) {
			if(time < this._deltaHistory[i].time) {
				this._deltaHistory.splice(i, 0, { delta: delta, source: source, time: time });
				addedDelta = true;
				break;
			}
		}
		if(!addedDelta) {
			this._deltaHistory.push({ delta: delta, source: source, time: time });
		}
		if(this._earliestDeltaTime === null || time < this._earliestDeltaTime) {
			this._earliestDeltaTime = time;
		}
		return time;
	};
	GamePlayer.prototype._getDeltasBetween = function(startTime, endTime) {
		var deltas = [];
		for(var i = 0; i < this._deltaHistory.length; i++) {
			if(this._deltaHistory[i].time >= endTime) {
				break;
			}
			if(this._deltaHistory[i].time >= startTime) {
				deltas.push(this._deltaHistory[i]);
			}
		}
		return deltas;
	};
	GamePlayer.prototype._removeDeltasBefore = function(time) {
		for(var i = 0; i < this._deltaHistory.length; i++) {
			if(this._deltaHistory[i].time >= time) {
				this._deltaHistory.splice(0, i);
				return;
			}
		}
		this._deltaHistory = [];
	};
	GamePlayer.prototype.getTime = function() {
		return this._gameTime;
	};
	GamePlayer.prototype.getSplitSecondTime = function() {
		if(this._timeOfLastUpdate === null) {
			return this._gameTime;
		}
		var now = Date.now();
		this._timeOfLastNow = now;
		this._gameTimeOfLastNow = this._gameTimeOfLastNow + (now - this._timeOfLastNow) * this._timeMultiplier;
		return this._gameTimeOfLastNow;
	};
	GamePlayer.prototype.getState = function() {
		return this._game.getState();
	};
	GamePlayer.prototype.setStateAndTime = function(state, time) {
		this._game.setState(state);
		this._gameTime = time;
		this._startingState = state;
		this._startingTime = time;
		this._removeDeltasBefore(time);
		this._stateHistory = [];
		this._earliestDeltaTime = null;
		this._timeToStateStorage = this._stateStorageFreq;
		this._timeOfLastUpdate = null;
		this._timeMultiplier = 1.00;
		this._timeOfLastNow = null;
		this._gameTimeOfLastNow = null;
	};
	GamePlayer.prototype.pause = function(pauseTime) {
		this._pauseTimeRemaining = (pauseTime ? pauseTime : -1);
	};
	GamePlayer.prototype.unpause = function() {
		this._pauseTimeRemaining = 0;
	};
	GamePlayer.prototype.slowDown = function(ms, duration) {
		duration = (duration || 1000);
		if(ms > duration) {
			this.pause(duration);
		}
		else {
			this._setSpeed(1 - ms / duration);
			this._timeUntilSpeedReverts = duration;
		}
	};
	GamePlayer.prototype.speedUp = function(ms, duration) {
		duration = (duration || 1000);
		this._setSpeed(1 + ms / duration);
		this._timeUntilSpeedReverts = duration;
	};
	GamePlayer.prototype._setSpeed = function(speed) {
		if(this._timeOfLastUpdate !== null) {
			var now = Date.now();
			this._timeOfLastNow = now;
			this._gameTimeOfLastNow = this._gameTimeOfLastNow + (now - this._timeOfLastNow) * this._timeMultiplier;
		}
		this._timeMultiplier = speed;
	};



	function Game() {
		this._entities = [];
	}
	Game.prototype.update = function(ms) {
		this._entities.forEach(function(entity) {
			entity.update(ms);
		});
	};
	Game.prototype.applyDelta = function(delta) {
		if(delta.type === 'SPAWN_ENTITY') {
			this._spawnEntity(delta.state);
		}
		else if(delta.type === 'SET_ENTITY_DIR') {
			this._setEntityDir(delta.entityId, delta.horizontal, delta.vertical);
		}
	};
	Game.prototype._spawnEntity = function(state) {
		this._entities.push(new GameEntity(state));
	};
	Game.prototype._setEntityDir = function(entityId, horizontal, vertical) {
		this._getEntity(entityId).setDir(horizontal, vertical);
	};
	Game.prototype._getEntity = function(id) {
		for(var i = 0; i < this._entities.length; i++) {
			if(this._entities[i].getId() === id) {
				return this._entities[i];
			}
		}
		return null;
	};
	Game.prototype.getState = function() {
		return {
			entities: this._entities.map(function(entity) {
				return entity.getState();	
			})
		};
	};
	Game.prototype.setState = function(state) {
		this._entities = state.entities.map(function(state) {
			return new GameEntity(state);
		});
	};



	function GameEntity(state) {
		this._horizontal = 0;
		this._vertical = 0;
		this.setState(state);
	}
	GameEntity.prototype.MOVE_SPEED = 150;
	GameEntity.prototype.DIAGONAL_MOVE_SPEED = GameEntity.prototype.MOVE_SPEED / Math.sqrt(2);
	GameEntity.prototype.getId = function() {
		return this._id;
	};
	GameEntity.prototype.update = function(ms) {
		var moveSpeed = this.MOVE_SPEED;
		if(this._horizontal !== 0 && this._vertical !== 0) {
			moveSpeed = this.DIAGONAL_MOVE_SPEED;
		}
		this._x += this._horizontal * moveSpeed * ms / 1000;
		this._y += this._vertical * moveSpeed * ms / 1000;
	};
	GameEntity.prototype.setDir = function(horizontal, vertical) {
		if(horizontal !== null) {
			this._horizontal = horizontal;
		}
		if(vertical !== null) {
			this._vertical = vertical;
		}
	};
	GameEntity.prototype.getState = function() {
		return {
			id: this._id,
			x: this._x,
			y: this._y,
			horizontal: this._horizontal,
			vertical: this._vertical,
			color: this._color
		};
	};
	GameEntity.prototype.setState = function(state) {
		this._id = state.id;
		this._x = state.x;
		this._y = state.y;
		this.setDir(state.horizontal, state.vertical);
		this._color = state.color;
	};



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

		//simulated lag
		this._isSimulatingLag = false;
		this._simulatedLagMin = 0;
		this._simulatedLagMax = 0;
		this._simulatedLagSpikeChance = 0;
		this._lastLaggedMessageTime = null;
		if(params.simulatedLag) {
			this._isSimulatingLag = true;
			this._simulatedLagMin = params.simulatedLag.min;
			this._simulatedLagMax = params.simulatedLag.max;
			this._simulatedLagSpikeChance = params.simulatedLag.spikeChance;
		}

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
		var self = this;
		this._socket.on('GAME_MESSAGES', function(messages) {
			if(self._isSimulatingLag) {
				var now = Date.now();
				var lag = (Math.random() < self._simulatedLagSpikeChance ? 1.5 + 2.5 * Math.random() : 1) *
						(Math.random() * (self._simulatedLagMax - self._simulatedLagMin) + self._simulatedLagMin);
				if(self._lastLaggedMessageTime !== null && now + lag < self._lastLaggedMessageTime) {
					self._lastLaggedMessageTime += 10;
					setTimeout(function() {
						messages.forEach(callback);
					}, self._lastLaggedMessageTime - now);
				}
				else {
					self._lastLaggedMessageTime = now + lag;
					setTimeout(function() {
						messages.forEach(callback);
					}, lag);
				}
			}
			else {
				messages.forEach(callback);
			}
		});
	};
	Connection.prototype.onDisconnect = function(callback) {
		this._socket.on('disconnect', callback);
	};



	function DelayCalculator(params) {
		params = (params || {});
		this._msBuffer = (params.msBuffer || 15);
		this._maxSpikes = (params.maxSpikesToRaiseDelay || 4);
		this._minGains = (params.minGainsToLowerDelay || 15);
		this._maxGains = (params.maxGainsToLowerDelay || 25);
		this._delay = null;
		this._delays = [];
		for(var i = 0; i < (params.maxHistory || 20); i++) {
			this._delays[i] = null;
		}
		this._nextDelayIndex = 0;
		this._additionsWithoutChangingDelay = 0;
	}
	DelayCalculator.prototype.getDelay = function() {
		return this._delay;
	};
	DelayCalculator.prototype.addDelay = function(delay) {
		this._delays[this._nextDelayIndex] = delay;
		this._nextDelayIndex++;
		if(this._nextDelayIndex >= this._delays.length) {
			this._nextDelayIndex = 0;
		}
		this._recalculateDelay();
	};
	DelayCalculator.prototype._recalculateDelay = function() {
		this._additionsWithoutChangingDelay++;
		var topDelays = [];
		var i, temp;
		for(i = 0; i < this._maxSpikes; i++) {
			topDelays[i] = null;
		}
		this._delays.forEach(function(delay) {
			if(delay !== null) {
				for(i = 0; i < topDelays.length; i++) {
					if(topDelays[i] === null) {
						topDelays[i] = delay;
						break;
					}
					else if(topDelays[i] < delay) {
						temp = topDelays[i];
						topDelays[i] = delay;
						delay = temp;
					}
				}
			}
		});
		if(this._delay === null) {
			//if the calculator is just starting out, initialize it to the first delay seen
			this._delay = topDelays[0] + this._msBuffer;
			this._additionsWithoutChangingDelay = 0;
		}
		else if(topDelays[topDelays.length - 1] !== null) {
			//raise the baseline if too many delays are above it
			if(topDelays[topDelays.length - 1] > this._delay) {
				this._delay = topDelays[0] + this._msBuffer;
				this._additionsWithoutChangingDelay = 0;
			}
			//lower the baseline if the gains are large enough
			else if(topDelays[0] + this._msBuffer < this._delay) {
				var gains = (this._delay - topDelays[0] - this._msBuffer);
				var gainsNecessaryToBeWorthIt = this._maxGains - (this._maxGains - this._minGains) * (Math.min(this._additionsWithoutChangingDelay, 2 * this._delays.length) / (2 * this._delays.length));
				if(gains > gainsNecessaryToBeWorthIt) {
					this._delay = topDelays[0] + this._msBuffer;
					this._additionsWithoutChangingDelay = 0;
				}
			}
		}
	};



	return {
		GamePlayer: GamePlayer,
		Game: Game,
		Connection: Connection,
		DelayCalculator: DelayCalculator
	};
})();

if(typeof module !== "undefined" && typeof module.exports !== "undefined") {
	module.exports = GameCommon;
}