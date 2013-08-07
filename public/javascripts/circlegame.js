var CircleGame = (function() {



	function GamePlayer(params) {
		this._gameTime = 0;
		this._game = new Game();
		this._maxRewind = (params.maxRewind || 0);
		this._actionHistory = [];
		this._stateHistory = [];
		this._startingState = this._game.getState();
		this._earliestActionTime = 0;
		this._timeToStateStorage = 0;
		this._stateStorageFreq = (params.stateStorageFreq || 250);
	}
	GamePlayer.prototype.update = function(ms) {
		var startTime = this._gameTime;
		var endTime = this._gameTime + ms;
		if(this._earliestActionTime !== null && this._earliestActionTime < this._gameTime) {
			startTime = this._rewind(this._earliestActionTime);
		}
		var actions = this._getActionsBetween(startTime, endTime);
		var currTime = startTime;
		for(var i = 0; i < actions.length; i++) {
			this._game.update(actions[i].time - currTime);
			currTime = actions[i].time;
			this._game.receiveAction(actions[i].action);
		}
		this._game.update(endTime - currTime);
		this._gameTime = endTime;
		this._removeActionsBefore(endTime - this._maxRewind);
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
		this._earliestActionTime = null;
	};
	GamePlayer.prototype._rewind = function(time) {
		for(var i = this._stateHistory.length - 1; i >= 0; i--) {
			if(this._stateHistory[i].time <= time) {
				this._game.setState(this._stateHistory[i].state);
				return this._stateHistory[i].time;
			}
		}
		this._game.setState(this._startingState);
		return 0;
	};
	GamePlayer.prototype.receiveAction = function(action, timeOffset) {
		timeOffset = (timeOffset || 0);
		if(timeOffset < -this._maxRewind) {
			timeOffset = -this._maxRewind;
		}
		var time = this._gameTime + timeOffset;
		if(time < 0) {
			time = 0;
		}
		this._addAction(action, time);
		if(this._earliestActionTime === null || this._gameTime + timeOffset < this._earliestActionTime) {
			this._earliestActionTime = time;
		}
	};
	GamePlayer.prototype._addAction = function(action, time) {
		for(var i = 0; i < this._actionHistory.length; i++) {
			if(time < this._actionHistory[i].time) {
				this._actionHistory.splice(i, 0, { action: action, time: time });
				return;
			}
		}
		this._actionHistory.push({ action: action, time: time });
	};
	GamePlayer.prototype._getActionsBetween = function(startTime, endTime) {
		var actions = [];
		for(var i = 0; i < this._actionHistory.length; i++) {
			if(this._actionHistory[i].time >= endTime) {
				break;
			}
			if(this._actionHistory[i].time >= startTime) {
				actions.push(this._actionHistory[i]);
			}
		}
		return actions;
	};
	GamePlayer.prototype._removeActionsBefore = function(time) {
		for(var i = 0; i < this._actionHistory.length; i++) {
			if(this._actionHistory.time >= time) {
				this._actionHistory.splice(0, i);
				return;
			}
		}
		this._actionHistory = [];
	};
	GamePlayer.prototype.getState = function() {
		return this._game.getState();
	};



	function Game() {
		this._entities = [];
	}
	Game.prototype.receiveAction = function(action) {
		if(action.type === 'SPAWN_ENTITY') {
			this.spawnEntity(action.state);
		}
		else if(action.type === 'SET_ENTITY_DIR') {
			this.setEntityDir(action.entityId, action.dir, action.axis);
		}
	};
	Game.prototype._getEntity = function(id) {
		for(var i = 0; i < this._entities.length; i++) {
			if(this._entities[i].getId() === id) {
				return this._entities[i];
			}
		}
		return null;
	};
	Game.prototype.spawnEntity = function(state) {
		this._entities.push(new GameEntity(state));
	};
	Game.prototype.setEntityDir = function(entityId, dir, axis) {
		this._getEntity(entityId).setDir(dir, axis);
	};
	Game.prototype.update = function(ms) {
		this._entities.forEach(function(entity) {
			entity.update(ms);
		});
	};
	Game.prototype.getState = function() {
		return {
			entities: this._entities.map(function(entity) {
				return entity.getState();	
			})
		};
	};
	Game.prototype.setState = function(state) {
		this._entites = state.entities.map(function(state) {
			return new GameEntity(state);
		});
	};



	function GameEntity(state) {
		this._horizontalMovement = 0;
		this._verticalMovement = 0;
		this.setState(state);
	}
	GameEntity.prototype.MOVE_SPEED = 150;
	GameEntity.prototype.DIAGONAL_MOVE_SPEED = GameEntity.prototype.MOVE_SPEED / Math.sqrt(2);
	GameEntity.prototype.getId = function() {
		return this._id;
	};
	GameEntity.prototype.setDir = function(dir, axis) {
		if(axis === 'HORIZONTAL') {
			this._setHorizontalDir(dir);
		}
		else if(axis === 'VERTICAL') {
			this._setVerticalDir(dir);
		}
		else {
			this._dir = dir;
			switch(dir) {
				case 'N':
					this._horizontalMovement = 0;
					this._verticalMovement = -1;
					break;
				case 'S':
					this._horizontalMovement = 0;
					this._verticalMovement = 1;
					break;
				case 'E':
					this._horizontalMovement = 1;
					this._verticalMovement = 0;
					break;
				case 'W':
					this._horizontalMovement = -1;
					this._verticalMovement = 0;
					break;
				case 'NE':
					this._horizontalMovement = 1;
					this._verticalMovement = -1;
					break;
				case 'NW':
					this._horizontalMovement = -1;
					this._verticalMovement = -1;
					break;
				case 'SE':
					this._horizontalMovement = 1;
					this._verticalMovement = 1;
					break;
				case 'SW':
					this._horizontalMovement = -1;
					this._verticalMovement = 1;
					break;
				default:
					this._horizontalMovement = 0;
					this._verticalMovement = 0;
					break;
			}
		}
	};
	GameEntity.prototype._setHorizontalDir = function(dir) {
		switch(dir) {
			case 'E':
				this._horizontalMovement = 1;
				if(this._dir === 'N' || this._dir === 'NE' || this._dir === 'NW') {
					this._dir = 'NE';
				}
				else if(this._dir === 'S' || this._dir === 'SE' || this._dir === 'SW') {
					this._dir = 'SE';
				}
				else {
					this._dir = 'E';
				}
				break;
			case 'W':
				this._horizontalMovement = -1;
				if(this._dir === 'N' || this._dir === 'NE' || this._dir === 'NW') {
					this._dir = 'NW';
				}
				else if(this._dir === 'S' || this._dir === 'SE' || this._dir === 'SW') {
					this._dir = 'SW';
				}
				else {
					this._dir = 'W';
				}
				break;
			default:
				this._horizontalMovement = 0;
				if(this._dir === 'N' || this._dir === 'NE' || this._dir === 'NW') {
					this._dir = 'N';
				}
				else if(this._dir === 'S' || this._dir === 'SE' || this._dir === 'SW') {
					this._dir = 'S';
				}
				else {
					this._dir = null;
				}
				break;
		}
	};
	GameEntity.prototype._setVerticalDir = function(dir) {
		switch(dir) {
			case 'N':
				this._verticalMovement = -1;
				if(this._dir === 'E' || this._dir === 'NE' || this._dir === 'SE') {
					this._dir = 'NE';
				}
				else if(this._dir === 'W' || this._dir === 'NW' || this._dir === 'SW') {
					this._dir = 'NW';
				}
				else {
					this._dir = 'N';
				}
				break;
			case 'S':
				this._verticalMovement = 1;
				if(this._dir === 'E' || this._dir === 'NE' || this._dir === 'SE') {
					this._dir = 'SE';
				}
				else if(this._dir === 'W' || this._dir === 'NW' || this._dir === 'SW') {
					this._dir = 'SW';
				}
				else {
					this._dir = 'S';
				}
				break;
			default:
				this._verticalMovement = 0;
				if(this._dir === 'E' || this._dir === 'NE' || this._dir === 'SE') {
					this._dir = 'E';
				}
				else if(this._dir === 'W' || this._dir === 'NW' || this._dir === 'SW') {
					this._dir = 'W';
				}
				else {
					this._dir = null;
				}
				break;
		}
	};
	GameEntity.prototype.update = function(ms) {
		var moveSpeed = this.MOVE_SPEED;
		if(this._horizontalMovement !== 0 && this._verticalMovement !== 0) {
			moveSpeed = this.DIAGONAL_MOVE_SPEED;
		}
		this._x += this._horizontalMovement * moveSpeed * ms / 1000;
		this._y += this._verticalMovement * moveSpeed * ms / 1000;
	};
	GameEntity.prototype.getState = function() {
		return {
			id: this._id,
			x: this._x,
			y: this._y,
			dir: this._dir,
			color: this._color
		};
	};
	GameEntity.prototype.setState = function(state) {
		this._id = state.id;
		this._x = state.x;
		this._y = state.y;
		this.setDir(state.dir);
		this._color = state.color;
	};



	return GamePlayer;
})();

if(typeof module !== "undefined" && typeof module.exports !== "undefined") {
	module.exports = CircleGame;
}