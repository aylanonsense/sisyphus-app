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
	DelayCalculatorEvaluator
		evaluate()
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
		var state = this._game.getState();
		state.timeMultiplier = this._timeMultiplier;
		state.time = this.getSplitSecondTime();
		return state;
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



	function DelayCalculator2(params) {
		this._historicalDelays = [];
		this._delay = 100;
		this._spikeProfiles = [
			{ spikes: 5, over: 15 },
			{ spikes: 4, over: 8 },
			{ spikes: 3, over: 4 }
		];
		this._delaysRelevantToLowering = 3;
		this._maxHistoricalDelays = this._delaysRelevantToLowering;
		for(var i = 0; i < this._spikeProfiles.length; i++) {
			if(this._spikeProfiles[i].over > this._maxHistoricalDelays) {
				this._maxHistoricalDelays = this._spikeProfiles[i].over;
			}
		}
		this._gainsRequiredToLower = [10];//[300, 150, 100, 75, 60, 50, 45, 40, 35, 30, 25, 20, 18, 16, 14, 12, 10];//[75, 70, 65, 60, 55, 50, 45, 40, 35, 30, 28, 26, 24, 22, 20];
		this._delaysSinceLastChange = 0;
	}
	DelayCalculator2.prototype.getDelay = function() {
		return this._delay;
	};
	DelayCalculator2.prototype.addDelay = function(delay) {
		this._historicalDelays.push(delay);
		if(this._historicalDelays.length > this._maxHistoricalDelays) {
			this._historicalDelays.splice(0, 1);
		}
		this._recalculateDelay(delay);
	};
	DelayCalculator2.prototype._recalculateDelay = function(mostRecentDelay) {
		var i, sortedDelays, delay, delays, idealDelay;
		var sortFn = function(a, b) { return a - b; };

		this._delaysSinceLastChange++;

		if(this._historicalDelays.length === 1) {
			this._delay = this._historicalDelays[0];
			this._delaysSinceLastChange = 0;
		}

		//we may need to raise the delay
		else if(mostRecentDelay > this._delay) {
			for(i = 0; i < this._spikeProfiles.length; i++) {
				delays = [];
				var spikes = 0;
				for(var j = 0; j < this._spikeProfiles[i].over && j < this._historicalDelays.length; j++) {
					delay = this._historicalDelays[this._historicalDelays.length - 1 - j];
					if(delay > this._delay) {
						spikes++;
					}
					delays.push(delay);
				}
				if(spikes >= this._spikeProfiles[i].spikes) {

					//there are enough spikes to warrant raising the delay
					sortedDelays = delays.sort(sortFn);
					if(sortedDelays.length === 1) {
						idealDelay = sortedDelays[0];
					}
					else {
						var smallestSpike = sortedDelays[sortedDelays.length - 2]; //sortedDelays[sortedDelays.length - this._spikeProfiles[i].spikes];
						var largestNonSpike = sortedDelays[sortedDelays.length - 3]; //sortedDelays[sortedDelays.length - this._spikeProfiles[i].spikes - 1]
						idealDelay = Math.min(1.1 * smallestSpike, 1.25 * largestNonSpike);
					}
					this._delay = idealDelay;
					this._delaysSinceLastChange = 0;
					break;
				}
			}
		}

		//we may need to lower the delay
		else if(mostRecentDelay < this._delay && this._historicalDelays.length > 2) {
			delays = [];
			for(i = 0; i < this._delaysRelevantToLowering && i < this._historicalDelays.length; i++) {
				delays.push(this._historicalDelays[this._historicalDelays.length - 1 - i]);
			}

			//decide on ideal delay
			var max1 = 0;
			var max2 = 0;
			var max3 = 0;
			for(i = 0; i < delays.length; i++) {
				delay = delays[i];
				if(delay >= max1) {
					max3 = max2;
					max2 = max1;
					max1 = delay;
				}
				else if(delay >= max2) {
					max3 = max2;
					max2 = delay;
				}
				else if(delay >= max3) {
					max3 = delay;
				}
			}
			idealDelay = Math.min(1.1 * max2, 1.25 * max3);

			if(idealDelay < this._delay) {
				//calc gains of new ideal delay
				var gains = 0;
				for(i = 0; i < this._delaysRelevantToLowering && i < delays.length; i++) {
					delay = delays[delays.length - 1 - i];
					if(delay < idealDelay) {
						gains += this._delay - idealDelay;
					}
					else if(delay < this._delay) {
						gains += this._delay - delay;
					}
				}
				var avgGains = gains / Math.min(this._delaysRelevantToLowering, delays.length);

				//change if gains are good enough
				var gainsNecessaryToBeWorthIt;
				if(this._delaysSinceLastChange - 1 >= this._gainsRequiredToLower.length) {
					gainsNecessaryToBeWorthIt = this._gainsRequiredToLower[this._gainsRequiredToLower.length - 1];
				}
				else {
					gainsNecessaryToBeWorthIt = this._gainsRequiredToLower[this._delaysSinceLastChange - 1];
				}

				if(avgGains > gainsNecessaryToBeWorthIt) {
					this._delay = idealDelay;
					this._delaysSinceLastChange = 0;
				}
			}
		}
	};



	function DelayCalculator3(params) {
		this._historicalDelays = [];
		this._maxHistory = 20;
		this._delay = 100;
		this._delaysToBaseSuggestionOn = 8;
		this._prevSuggestion = null;
		this._riseReqdToChange = [200, 120, 50, 15, 10, 5];
		this._riseReqdToChangeIfStable = [80, 50, 25, 15, 10, 5];
		this._fallReqdToChange = [300, 180, 100, 80, 50, 25, 10, 5];
		this._fallReqdToChangeIfStable = [140, 80, 50, 25, 15, 10, 5];
		this._mismatchLowerBound = [0.9];
		this._mismatchUpperBound = [1.1];
		this._delaysSinceLastChange = 0;
		this._numRecentMismatches = 0;
		this._prevWasMismatch = false;
	}
	DelayCalculator3.prototype.getDelay = function() {
		return this._delay;
	};
	DelayCalculator3.prototype.addDelay = function(delay) {
		this._historicalDelays.push(delay);
		if(this._historicalDelays.length > this._maxHistory) {
			this._historicalDelays.splice(0, 1);
		}
		this._recalculateDelay(delay);
	};
	DelayCalculator3.prototype._recalculateDelay = function(mostRecentDelay) {
		var i, suggestion, max1, max2, max3, max4, max5, sum, nonSpikeAvg;
		if(this._historicalDelays.length <= this._delaysToBaseSuggestionOn) {
			this._delay = Math.floor(this._historicalDelays[0]);
		}
		else {
			//generate suggestion
			max1 = 0;
			max2 = 0;
			max3 = 0;
			sum = 0;
			for(i = 1; i <= this._delaysToBaseSuggestionOn; i++) {
				if(this._prev(i) > max1) {
					max3 = max2;
					max2 = max1;
					max1 = this._prev(i);
				}
				else if(this._prev(i) > max2) {
					max3 = max2;
					max2 = this._prev(i);
				}
				else if(this._prev(i) > max3) {
					max3 = this._prev(i);
				}
				sum += this._prev(i);
			}
			nonSpikeAvg = (sum - max1 - max2) / (this._delaysToBaseSuggestionOn - 2);
			if(max1 < 1.25 * nonSpikeAvg) {
				suggestion = max1;
			}
			else if(max2 < 1.25 * nonSpikeAvg) {
				suggestion = max2;
			}
			else {
				suggestion = max3;
			}

			//raise suggestion if it's too low and would require significant rewinds
			max1 = 0;
			max2 = 0;
			max3 = 0;
			max4 = 0;
			sum = 0;
			for(i = 1; i <= this._historicalDelays.length; i++) {
				if(this._prev(i) > max1) {
					max4 = max3;
					max3 = max2;
					max2 = max1;
					max1 = this._prev(i);
				}
				else if(this._prev(i) > max2) {
					max4 = max3;
					max3 = max2;
					max2 = this._prev(i);
				}
				else if(this._prev(i) > max3) {
					max4 = max3;
					max3 = this._prev(i);
				}
				else if(this._prev(i) > max4) {
					max4 = this._prev(i);
				}
				sum += this._prev(i);
			}
			if(max4 > suggestion) {
				suggestion = max4;
			}
			if(max3 < 1.25 * nonSpikeAvg && max3 > suggestion) {
				suggestion = max3;
			}

			//the suggestion can't be less than the most recent delay
			if(suggestion < this._delay && suggestion < mostRecentDelay) {
				suggestion = Math.min(this._delay, mostRecentDelay);
			}

			//determine if suggestion is stable
			var isStable = (this._prevSuggestion !== null && 0.9 * suggestion < this._prevSuggestion && this._prevSuggestion < 1.1 * suggestion);

			//determine if the delta is large enough to warrant a change
			var deltaReqd;
			if(isStable) {
				if(suggestion < this._delay) {
					deltaReqd = this._fallReqdToChangeIfStable[Math.min(this._numRecentMismatches, this._fallReqdToChangeIfStable.length - 1)];
				}
				else {
					deltaReqd = this._riseReqdToChangeIfStable[Math.min(this._numRecentMismatches, this._riseReqdToChangeIfStable.length - 1)];
				}
			}
			else {
				if(suggestion < this._delay) {
					deltaReqd = this._fallReqdToChange[Math.min(this._numRecentMismatches, this._fallReqdToChange.length - 1)];
				}
				else {
					deltaReqd = this._riseReqdToChange[Math.min(this._numRecentMismatches, this._riseReqdToChange.length - 1)];
				}
			}
			var delta = suggestion - this._delay;
			if(delta < 0) {
				delta *= -1;
			}
			if(delta > deltaReqd) {
				//change to the suggested delay
				this._delay = Math.floor(suggestion);
				this._prevSuggestion = null;
				this._delaysSinceLastChange = 0;
				this._numRecentMismatches = 0;
				this._prevWasMismatch = false;
			}
			else {
				//maintain current delay
				this._prevSuggestion = suggestion;
				if(suggestion < this._mismatchLowerBound[Math.min(this._mismatchLowerBound.length - 1, this._delaysSinceLastChange)] * this._delay || suggestion > this._mismatchUpperBound[Math.min(this._mismatchUpperBound.length - 1, this._delaysSinceLastChange)] * this._delay) {
					this._numRecentMismatches++;
					this._prevWasMismatch = true;
				}
				else {
					if(!this._prevWasMismatch) {
						numRecentMismatches = 0;
					}
					this._prevWasMismatch = false;
				}
				this._delaysSinceLastChange++;
			}
		}
	};
	DelayCalculator3.prototype._prev = function(delta) {
		if(delta > this._historicalDelays.length) {
			return null;
		}
		return this._historicalDelays[this._historicalDelays.length - 1 - delta];
	};



	function DelayVisualizer($ele, maxColumns) {
		this._actualDelays = [];
		this._calculatedDelays = [];
		this._root = $('<div style="position:relative;width:1100px;height:250px;border:3px solid #ccc;"></div>').appendTo($ele);
		this._max = 0;
		this._maxDelaysDisplayed = maxColumns;
	}
	DelayVisualizer.prototype.render = function(actualDelay, calculatedDelays) {
		var i, j;
		var colors = [ 'red', 'green', 'blue', 'purple' ];
		this._actualDelays.push(actualDelay);
		if(this._actualDelays.length > this._maxDelaysDisplayed) {
			this._actualDelays.splice(0, 1);
		}
		while(this._calculatedDelays.length < calculatedDelays.length) {
			this._calculatedDelays.push([]);
		}
		for(i = 0; i < calculatedDelays.length; i++) {
			this._calculatedDelays[i].push(calculatedDelays[i]);
			if(this._calculatedDelays[i].length > this._maxDelaysDisplayed) {
				this._calculatedDelays[i].splice(0, 1);
			}
		}
		this._root.empty();
		for(i = 0; i < this._actualDelays.length; i++) {
			if(this._actualDelays[i] > this._max) {
				this._max = this._actualDelays[i];
			}
			for(j = 0; j < this._calculatedDelays.length; j++) {
				if(this._calculatedDelays[j][i] > this._max) {
					this._max = this._calculatedDelays[j][i];
				}
			}
		}
		for(i = 0; i < this._actualDelays.length; i++) {
			$('<div style="position:absolute;left:' + (100 * i / this._maxDelaysDisplayed) + '%;bottom:0%;background-color:black;width:' + (100 / this._maxDelaysDisplayed) + '%;height:' + 100 * this._actualDelays[i] / this._max + '%;"></div>').appendTo(this._root);
			for(j = 0; j < this._calculatedDelays.length; j++) {
				$('<div style="position:absolute;left:' + (100 * i / this._maxDelaysDisplayed) + '%;bottom:0%;border-top:3px solid ' + colors[j % colors.length] + ';width:' + (100 / this._maxDelaysDisplayed) + '%;height:' + 100 * this._calculatedDelays[j][i] / this._max + '%;"></div>').appendTo(this._root);
			}
		}
	};



	function DelayCalculatorTester(Calcs, $ele, ms, maxColumns) {
		var i;
		var delay200ms = [198, 202, 225, 219, 181, 188, 200, 215, 206, 195, 193, 181, 191, 203, 177, 221, 207, 200, 200, 181, 184, 223, 197, 191, 205, 203, 201, 221, 194, 192, 190, 192, 224, 181, 213, 191, 204, 188, 218, 196, 186, 188, 209, 197, 179, 190, 207, 211, 195, 199, 200, 198, 187, 191, 185, 207, 224, 200, 209, 195];
		var delay140ms = [131, 154, 125, 149, 142, 148, 148, 148, 154, 148, 155, 123, 147, 144, 126, 148, 131, 133, 126, 143, 130, 137, 127, 131, 156, 128, 155, 154, 147, 128, 138, 144, 122, 147, 141, 140, 138, 153, 158, 128, 155, 145, 141, 135, 140, 134, 132, 124, 137, 131, 127, 155, 125, 124, 145, 154, 123, 141, 158, 155];
		var delay110ms = [97, 108, 116, 93, 123, 125, 123, 121, 115, 100, 92, 122, 127, 96, 120, 102, 111, 118, 103, 125, 96, 126, 102, 110, 101, 107, 129, 129, 128, 91, 114, 111, 96, 111, 106, 106, 106, 110, 108, 91, 94, 104, 122, 127, 90, 109, 116, 125, 122, 119, 108, 118, 111, 93, 93, 120, 126, 116, 118, 129];
		var delay90ms = [82, 90, 86, 92, 97, 94, 91, 98, 98, 87, 90, 97, 88, 90, 97, 84, 97, 93, 83, 90, 87, 93, 82, 90, 83, 92, 91, 98, 84, 85, 85, 85, 85, 93, 83, 91, 85, 81, 96, 96, 96, 94, 87, 90, 92, 84, 82, 84, 97, 97, 84, 94, 95, 97, 84, 93, 87, 95, 98, 87];
		var delay80ms = [74, 80, 77, 73, 82, 84, 86, 74, 72, 82, 87, 74, 78, 83, 76, 73, 79, 84, 78, 76, 73, 74, 83, 86, 80, 88, 87, 80, 75, 80, 85, 87, 87, 87, 83, 78, 74, 78, 82, 85, 86, 77, 87, 79, 82, 87, 73, 79, 74, 87, 82, 74, 73, 79, 72, 80, 81, 86, 83, 77];
		var delay60ms = [54, 63, 67, 59, 65, 63, 55, 55, 57, 54, 58, 57, 58, 65, 54, 56, 66, 65, 56, 63, 55, 53, 56, 59, 67, 54, 53, 59, 56, 63, 66, 58, 54, 63, 62, 60, 62, 56, 56, 55, 59, 53, 56, 54, 66, 54, 59, 64, 63, 63, 54, 62, 57, 66, 64, 61, 58, 65, 56, 59];
		var delay30ms = [34, 33, 30, 27, 32, 28, 31, 25, 33, 28, 28, 32, 26, 26, 27, 31, 34, 32, 32, 32, 25, 26, 32, 29, 27, 26, 26, 30, 28, 30, 27, 27, 31, 32, 33, 34, 26, 30, 26, 34, 28, 29, 33, 28, 28, 30, 32, 35, 30, 26, 26, 31, 34, 31, 34, 34, 34, 25, 34, 29];
		var delay15ms = [15, 13, 16, 16, 14, 15, 16, 14, 14, 17, 14, 17, 17, 15, 15, 14, 14, 14, 16, 16, 16, 15, 13, 16, 16, 15, 17, 16, 16, 15, 17, 15, 16, 14, 17, 16, 16, 15, 14, 15, 16, 14, 17, 17, 16, 14, 16, 17, 15, 13, 14, 13, 16, 15, 14, 14, 14, 14, 16, 16];
		var delays = [ delay15ms, delay30ms, delay60ms, delay80ms, delay90ms, delay110ms, delay200ms ];
		var visualizer = new DelayVisualizer($ele, maxColumns);
		var calcs = [];
		var currDelay = 6;
		for(i = 0; i < Calcs.length; i++) {
			calcs[i] = new Calcs[i]();
		}
		setInterval(function() {
			var delay = delays[currDelay][Math.floor(Math.random() * (delays[currDelay].length))];
			if(Math.random() < 0.008) {
				currDelay = Math.floor(Math.random() * (delays.length));
			}
			if(Math.random() < 0.005) {
				delay *= 1.1 + 1.9 * Math.random();
			}
			var predictions = [];
			for(i = 0; i < calcs.length; i++) {
				calcs[i].addDelay(delay);
				predictions[i] = calcs[i].getDelay();
			}
			visualizer.render(delay, predictions);
		}, ms);
	}



	function DelayCalculatorEvaluator(Calc) {
		this._CalculatorClass = Calc;
	}
	DelayCalculatorEvaluator.prototype.evaluate = function() {
		var i, r, d, score;
		var results = {
			speed: {
				rise: {},
				drop: {}
			},
			changes: {
				rise: {},
				drop: {}
			},
			accuracy: {
				rise: {},
				drop: {}
			},
			spikes: {}
		};
		var delay200ms = [198, 202, 225, 219, 181, 188, 200, 215, 206, 195, 193, 181, 191, 203, 177, 221, 207, 200, 200, 181, 184, 223, 197, 191, 205, 203, 201, 221, 194, 192, 190, 192, 224, 181, 213, 191, 204, 188, 218, 196, 186, 188, 209, 197, 179, 190, 207, 211, 195, 199, 200, 198, 187, 191, 185, 207, 224, 200, 209, 195];
		var delay140ms = [131, 154, 125, 149, 142, 148, 148, 148, 154, 148, 155, 123, 147, 144, 126, 148, 131, 133, 126, 143, 130, 137, 127, 131, 156, 128, 155, 154, 147, 128, 138, 144, 122, 147, 141, 140, 138, 153, 158, 128, 155, 145, 141, 135, 140, 134, 132, 124, 137, 131, 127, 155, 125, 124, 145, 154, 123, 141, 158, 155];
		var delay110ms = [97, 108, 116, 93, 123, 125, 123, 121, 115, 100, 92, 122, 127, 96, 120, 102, 111, 118, 103, 125, 96, 126, 102, 110, 101, 107, 129, 129, 128, 91, 114, 111, 96, 111, 106, 106, 106, 110, 108, 91, 94, 104, 122, 127, 90, 109, 116, 125, 122, 119, 108, 118, 111, 93, 93, 120, 126, 116, 118, 129];
		var delay90ms = [82, 90, 86, 92, 97, 94, 91, 98, 98, 87, 90, 97, 88, 90, 97, 84, 97, 93, 83, 90, 87, 93, 82, 90, 83, 92, 91, 98, 84, 85, 85, 85, 85, 93, 83, 91, 85, 81, 96, 96, 96, 94, 87, 90, 92, 84, 82, 84, 97, 97, 84, 94, 95, 97, 84, 93, 87, 95, 98, 87];
		var delay80ms = [74, 80, 77, 73, 82, 84, 86, 74, 72, 82, 87, 74, 78, 83, 76, 73, 79, 84, 78, 76, 73, 74, 83, 86, 80, 88, 87, 80, 75, 80, 85, 87, 87, 87, 83, 78, 74, 78, 82, 85, 86, 77, 87, 79, 82, 87, 73, 79, 74, 87, 82, 74, 73, 79, 72, 80, 81, 86, 83, 77];
		var delay60ms = [54, 63, 67, 59, 65, 63, 55, 55, 57, 54, 58, 57, 58, 65, 54, 56, 66, 65, 56, 63, 55, 53, 56, 59, 67, 54, 53, 59, 56, 63, 66, 58, 54, 63, 62, 60, 62, 56, 56, 55, 59, 53, 56, 54, 66, 54, 59, 64, 63, 63, 54, 62, 57, 66, 64, 61, 58, 65, 56, 59];
		var delay30ms = [34, 33, 30, 27, 32, 28, 31, 25, 33, 28, 28, 32, 26, 26, 27, 31, 34, 32, 32, 32, 25, 26, 32, 29, 27, 26, 26, 30, 28, 30, 27, 27, 31, 32, 33, 34, 26, 30, 26, 34, 28, 29, 33, 28, 28, 30, 32, 35, 30, 26, 26, 31, 34, 31, 34, 34, 34, 25, 34, 29];
		var delay15ms = [15, 13, 16, 16, 14, 15, 16, 14, 14, 17, 14, 17, 17, 15, 15, 14, 14, 14, 16, 16, 16, 15, 13, 16, 16, 15, 17, 16, 16, 15, 17, 15, 16, 14, 17, 16, 16, 15, 14, 15, 16, 14, 17, 17, 16, 14, 16, 17, 15, 13, 14, 13, 16, 15, 14, 14, 14, 14, 16, 16];

		//evaluate ability to lower delay quickly in response to drops
		results.speed.drop.from140to60msWithoutVariance = this._evaluateTrend(140, 60);
		results.speed.drop.from200to110ms = this._evaluateTrend(200, 110, delay200ms, delay110ms);
		results.speed.drop.from140to60ms = this._evaluateTrend(140, 60, delay140ms, delay60ms);
		results.speed.drop.from110to60ms = this._evaluateTrend(110, 60, delay110ms, delay60ms);

		//evaluate ability to increase delay quickly in response to rises
		results.speed.rise.from60to140msWithoutVariance = this._evaluateTrend(60, 140);
		results.speed.rise.from110to200ms = this._evaluateTrend(110, 200, delay110ms, delay200ms);
		results.speed.rise.from60to140ms = this._evaluateTrend(60, 140, delay60ms, delay140ms);
		results.speed.rise.from60to110ms = this._evaluateTrend(60, 80, delay60ms, delay110ms);

		//evaluate ability to ignore and detect spikes
		results.spikes.ignoreTwoLargeSpikes = !this._evaluateSpike(delay110ms, [800, 800]);

		//evaluate ability to increase delay in few changes after drops
		results.changes.drop.from140to60msWithoutVariance = this._evaluateNumChanges(140, 60);
		results.changes.drop.from200to110ms = this._evaluateNumChanges(200, 110, delay200ms, delay110ms);
		results.changes.drop.from140to60ms = this._evaluateNumChanges(140, 60, delay140ms, delay60ms);
		results.changes.drop.from110to60ms = this._evaluateNumChanges(110, 60, delay110ms, delay60ms);

		//evaluate ability to increase delay in few changes after rises
		results.changes.rise.from60to140msWithoutVariance = this._evaluateNumChanges(60, 140);
		results.changes.rise.from110to200ms = this._evaluateNumChanges(110, 200, delay110ms, delay200ms);
		results.changes.rise.from60to140ms = this._evaluateNumChanges(60, 140, delay60ms, delay140ms);
		results.changes.rise.from60to110ms = this._evaluateNumChanges(60, 110, delay60ms, delay110ms);

		//evaluate accuracy of choosing delay after drops
		results.accuracy.drop.from140to60msWithoutVariance = this._evaluateAccuracy(140, 60);
		results.accuracy.drop.from200to110ms = this._evaluateAccuracy(200, 110, delay200ms, delay110ms);
		results.accuracy.drop.from140to60ms = this._evaluateAccuracy(140, 60, delay140ms, delay60ms);
		results.accuracy.drop.from110to60ms = this._evaluateAccuracy(110, 60, delay110ms, delay60ms);

		//evaluate accuracy of choosing delay after rises
		results.accuracy.rise.from60to140msWithoutVariance = this._evaluateAccuracy(60, 140);
		results.accuracy.rise.from110to200ms = this._evaluateAccuracy(110, 200, delay110ms, delay200ms);
		results.accuracy.rise.from60to140ms = this._evaluateAccuracy(60, 140, delay60ms, delay140ms);
		results.accuracy.rise.from60to110ms = this._evaluateAccuracy(60, 110, delay60ms, delay110ms);

		results.spikes.score = (results.spikes.ignoreTwoLargeSpikes ? 1 : 0);
		results.changes.score = ((results.changes.drop.from110to60ms === 0 ? 0 : 1 / results.changes.drop.from110to60ms) +
				(results.changes.drop.from140to60ms === 0 ? 0 : 1 / results.changes.drop.from140to60ms) +
				(results.changes.drop.from140to60msWithoutVariance === 0 ? 0 : 1 / results.changes.drop.from140to60msWithoutVariance) +
				(results.changes.drop.from200to110ms === 0 ? 0 : 1 / results.changes.drop.from200to110ms) +
				(results.changes.rise.from60to110ms === 0 ? 0 : 1 / results.changes.rise.from60to110ms) +
				(results.changes.rise.from60to140ms === 0 ? 0 : 1 / results.changes.rise.from60to140ms) +
				(results.changes.rise.from60to140msWithoutVariance === 0 ? 0 : 1 / results.changes.rise.from60to140msWithoutVariance) +
				(results.changes.rise.from110to200ms === 0 ? 0 : 1 / results.changes.rise.from110to200ms)) / 8;
		results.speed.score = ((results.speed.drop.from110to60ms === 0 ? 0 : 1 / results.speed.drop.from110to60ms) +
				(results.speed.drop.from140to60ms === 0 ? 0 : 1 / results.speed.drop.from140to60ms) +
				(results.speed.drop.from140to60msWithoutVariance === 0 ? 0 : 1 / results.speed.drop.from140to60msWithoutVariance) +
				(results.speed.drop.from200to110ms === 0 ? 0 : 1 / results.speed.drop.from200to110ms) +
				(results.speed.rise.from60to110ms === 0 ? 0 : 1 / results.speed.rise.from60to110ms) +
				(results.speed.rise.from60to140ms === 0 ? 0 : 1 / results.speed.rise.from60to140ms) +
				(results.speed.rise.from60to140msWithoutVariance === 0 ? 0 : 1 / results.speed.rise.from60to140msWithoutVariance) +
				(results.speed.rise.from110to200ms === 0 ? 0 : 1 / results.speed.rise.from110to200ms)) / 8;
		results.accuracy.score = ((results.accuracy.drop.from110to60ms < 1 ? results.accuracy.drop.from110to60ms : 1 / results.accuracy.drop.from110to60ms) +
				(results.accuracy.drop.from140to60ms < 1 ? results.accuracy.drop.from140to60ms : 1 / results.accuracy.drop.from140to60ms) +
				(results.accuracy.drop.from140to60msWithoutVariance < 1 ? results.accuracy.drop.from140to60msWithoutVariance : 1 / results.accuracy.drop.from140to60msWithoutVariance) +
				(results.accuracy.drop.from200to110ms < 1 ? results.accuracy.drop.from200to110ms : 1 / results.accuracy.drop.from200to110ms) +
				(results.accuracy.rise.from60to110ms < 1 ? results.accuracy.rise.from60to110ms : 1 / results.accuracy.rise.from60to110ms) +
				(results.accuracy.rise.from60to140ms < 1 ? results.accuracy.rise.from60to140ms : 1 / results.accuracy.rise.from60to140ms) +
				(results.accuracy.rise.from110to200ms < 1 ? results.accuracy.rise.from110to200ms : 1 / results.accuracy.rise.from110to200ms) +
				(results.accuracy.rise.from60to140msWithoutVariance < 1 ? results.accuracy.rise.from60to140msWithoutVariance : 1 / results.accuracy.rise.from60to140msWithoutVariance)) / 8;
		results.score = Math.floor(1000 * (0.1 * results.spikes.score + 0.3 * results.changes.score + 0.3 * results.speed.score + 0.3 * results.accuracy.score)) / 10;

		return results;
	};
	DelayCalculatorEvaluator.prototype._evaluateTrend = function(diff1, diff2, arr1, arr2) {
		this._initCalc();
		for(i = 0; i < (arr1 ? arr1.length : 60); i++) {
			this._addDelay(arr1 ? arr1[i] : diff1);
		}
		this._resetMetrics();
		for(i = 0; i < (arr2 ? arr2.length : 60); i++) {
			this._addDelay(arr2 ? arr2[i] : diff2);
			if(this._sumDelta <= (diff2 - diff1) * 0.7) {
				return i + 1;
			}
		}
		return 60;
	};
	DelayCalculatorEvaluator.prototype._evaluateSpike = function(arr, spikes) {
		this._initCalc();
		var sum = 0;
		for(i = 0; i < arr.length; i++) {
			this._addDelay(arr[i]);
			sum += arr[i];
		}
		var avg = sum / arr.length;
		this._resetMetrics();
		var spikeSum = 0;
		for(i = 0; i < spikes.length; i++) {
			this._addDelay(spikes[i]);
			spikeSum += spikes[i];
		}
		var spikeAvg = spikeSum / spikes.length;
		if(spikeAvg > avg) {
			return (spikeAvg - avg) * 0.7 < this._sumDelta;
		}
		else {
			return (spikeAvg - avg) * 0.7 > this._sumDelta;
		}
	};
	DelayCalculatorEvaluator.prototype._evaluateNumChanges = function(diff1, diff2, arr1, arr2) {
		this._initCalc();
		for(i = 0; i < (arr1 ? arr1.length : 60); i++) {
			this._addDelay(arr1 ? arr1[i] : diff1);
		}
		this._resetMetrics();
		for(i = 0; i < (arr2 ? arr2.length : 60); i++) {
			this._addDelay(arr2 ? arr2[i] : diff2);
		}
		return this._numChanges;
	};
	DelayCalculatorEvaluator.prototype._evaluateAccuracy = function(diff1, diff2, arr1, arr2) {
		this._initCalc();
		for(i = 0; i < (arr1 ? arr1.length : 60); i++) {
			this._addDelay(arr1 ? arr1[i] : diff1);
		}
		this._resetMetrics();
		for(i = 0; i < (arr2 ? arr2.length : 60); i++) {
			this._addDelay(arr2 ? arr2[i] : diff2);
		}
		return (this._sumDelta)/(diff2 - diff1);
	};
	DelayCalculatorEvaluator.prototype._initCalc = function() {
		this._calc = new this._CalculatorClass();
		this._resetMetrics();
	};
	DelayCalculatorEvaluator.prototype._addDelay = function(delay) {
		var result = {
			before: this._calc.getDelay()
		};
		this._calc.addDelay(delay);
		result.after = this._calc.getDelay();
		result.changed = (result.before !== result.after);
		result.dropped = (result.before !== null && result.before > result.after);
		result.rose = (result.before !== null && result.before < result.after);
		result.delta = (result.before === null ? result.after : result.after - result.before);
		result.initialized = (result.before === null);
		this._sumDelta += result.delta;
		this._numChanges += (result.changed ? 1 : 0 );
		return result;
	};
	DelayCalculatorEvaluator.prototype._resetMetrics = function() {
		this._sumDelta = 0;
		this._numChanges = 0;
	};



	return {
		GamePlayer: GamePlayer,
		Game: Game,
		Connection: Connection,
		DelayCalculator: DelayCalculator3,
		DelayCalculatorEvaluator: DelayCalculatorEvaluator,
		DelayVisualizer: DelayVisualizer,
		DelayCalculatorTester: DelayCalculatorTester
	};
})();

if(typeof module !== "undefined" && typeof module.exports !== "undefined") {
	module.exports = GameCommon;
}