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
		this._removeHistoryBefore(endTime - this._maxRewind);
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
	GamePlayer.prototype._removeHistoryBefore = function(time) {
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
	Game.Action = {
		CHANGE_ENTITY_DIR: 'CHANGE_ENTITY_DIR',
		SPAWN_ENTITY: 'SPAWN_ENTITY'
	};
	Game.Direction = {
		NONE: null,
		NORTH: 'N',
		SOUTH: 'S',
		EAST: 'E',
		WEST: 'W',
		NORTHEAST: 'NE',
		NORTHWEST: 'NW',
		SOUTHEAST: 'SE',
		SOUTHWEST: 'SW'
	};
	Game.prototype._getEntity = function(id) {
		for(var i = 0; i < this._entities.length; i++) {
			if(this._entities[i].getId() === id) {
				return this._entities[i];
			}
		}
		return null;
	};
	Game.prototype.receiveAction = function(action) {
		if(action.type === Game.Action.CHANGE_ENTITY_DIR) {
			this._getEntity(action.entityId).receiveAction({
				type: GameEntity.Action.CHANGE_DIR,
				dir: action.dir,
				axis: (action.axis || 'BOTH')
			});
		}
		else if(action.type == Game.Action.SPAWN_ENTITY) {
			this._entities.push(new GameEntity(action.state));
		}
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
		this.setState(state);
	}
	GameEntity.MOVE_SPEED = 150;
	GameEntity.DIAGONAL_MOVE_SPEED = GameEntity.MOVE_SPEED / Math.sqrt(2);
	GameEntity.Action = {
		CHANGE_DIR: 'CHANGE_DIR'
	};
	GameEntity.prototype.getId = function() {
		return this._id;
	};
	GameEntity.prototype.receiveAction = function(action) {
		if(action.type === GameEntity.Action.CHANGE_DIR) {
			if(action.axis === 'HORIZONTAL') {
				this._setHorizontalDir(action.dir);
			}
			else if(action.axis === 'VERTICAL') {
				this._setVerticalDir(action.dir);
			}
			else {
				this._setDir(action.dir);
			}
		}
	};
	GameEntity.prototype.update = function(ms) {
		var moveSpeed = GameEntity.MOVE_SPEED;
		if(this._horizontalMovement !== 0 && this._verticalMovement !== 0) {
			moveSpeed = GameEntity.DIAGONAL_MOVE_SPEED;
		}
		this._x += this._horizontalMovement * moveSpeed * ms / 1000;
		this._y += this._verticalMovement * moveSpeed * ms / 1000;
	};
	GameEntity.prototype._setDir = function(dir) {
		this._dir = dir;
		switch(dir) {
			case Game.Direction.NORTH:
				this._horizontalMovement = 0;
				this._verticalMovement = -1;
				break;
			case Game.Direction.SOUTH:
				this._horizontalMovement = 0;
				this._verticalMovement = 1;
				break;
			case Game.Direction.EAST:
				this._horizontalMovement = 1;
				this._verticalMovement = 0;
				break;
			case Game.Direction.WEST:
				this._horizontalMovement = -1;
				this._verticalMovement = 0;
				break;
			case Game.Direction.NORTHEAST:
				this._horizontalMovement = 1;
				this._verticalMovement = -1;
				break;
			case Game.Direction.NORTHWEST:
				this._horizontalMovement = -1;
				this._verticalMovement = -1;
				break;
			case Game.Direction.SOUTHEAST:
				this._horizontalMovement = 1;
				this._verticalMovement = 1;
				break;
			case Game.Direction.SOUTHWEST:
				this._horizontalMovement = -1;
				this._verticalMovement = 1;
				break;
			default:
				this._horizontalMovement = 0;
				this._verticalMovement = 0;
				break;
		}
	};
	GameEntity.prototype._setHorizontalDir = function(dir) {
		switch(dir) {
			case Game.Direction.EAST:
				this._horizontalMovement = 1;
				if(this._dir === Game.Direction.NORTH ||
						this._dir === Game.Direction.NORTHEAST ||
						this._dir === Game.Direction.NORTHWEST) {
					this._dir = Game.Direction.NORTHEAST;
				}
				else if(this._dir === Game.Direction.SOUTH ||
						this._dir === Game.Direction.SOUTHEAST ||
						this._dir === Game.Direction.SOUTHWEST) {
					this._dir = Game.Direction.SOUTHEAST;
				}
				else {
					this._dir = Game.Direction.EAST;
				}
				break;
			case Game.Direction.WEST:
				this._horizontalMovement = -1;
				if(this._dir === Game.Direction.NORTH ||
						this._dir === Game.Direction.NORTHEAST ||
						this._dir === Game.Direction.NORTHWEST) {
					this._dir = Game.Direction.NORTHWEST;
				}
				else if(this._dir === Game.Direction.SOUTH ||
						this._dir === Game.Direction.SOUTHEAST ||
						this._dir === Game.Direction.SOUTHWEST) {
					this._dir = Game.Direction.SOUTHWEST;
				}
				else {
					this._dir = Game.Direction.WEST;
				}
				break;
			default:
				this._horizontalMovement = 0;
				if(this._dir === Game.Direction.NORTH ||
						this._dir === Game.Direction.NORTHEAST ||
						this._dir === Game.Direction.NORTHWEST) {
					this._dir = Game.Direction.NORTH;
				}
				else if(this._dir === Game.Direction.SOUTH ||
						this._dir === Game.Direction.SOUTHEAST ||
						this._dir === Game.Direction.SOUTHWEST) {
					this._dir = Game.Direction.SOUTH;
				}
				else {
					this._dir = Game.Direction.NONE;
				}
				break;
		}
	};
	GameEntity.prototype._setVerticalDir = function(dir) {
		switch(dir) {
			case Game.Direction.NORTH:
				this._verticalMovement = -1;
				if(this._dir === Game.Direction.EAST ||
						this._dir === Game.Direction.NORTHEAST ||
						this._dir === Game.Direction.SOUTHEAST) {
					this._dir = Game.Direction.NORTHEAST;
				}
				else if(this._dir === Game.Direction.WEST ||
						this._dir === Game.Direction.NORTHWEST ||
						this._dir === Game.Direction.SOUTHWEST) {
					this._dir = Game.Direction.NORTHWEST;
				}
				else {
					this._dir = Game.Direction.NORTH;
				}
				break;
			case Game.Direction.SOUTH:
				this._verticalMovement = 1;
				if(this._dir === Game.Direction.EAST ||
						this._dir === Game.Direction.NORTHEAST ||
						this._dir === Game.Direction.SOUTHEAST) {
					this._dir = Game.Direction.SOUTHEAST;
				}
				else if(this._dir === Game.Direction.WEST ||
						this._dir === Game.Direction.NORTHWEST ||
						this._dir === Game.Direction.SOUTHWEST) {
					this._dir = Game.Direction.SOUTHWEST;
				}
				else {
					this._dir = Game.Direction.SOUTH;
				}
				break;
			default:
				this._verticalMovement = 0;
				if(this._dir === Game.Direction.EAST ||
						this._dir === Game.Direction.NORTHEAST ||
						this._dir === Game.Direction.SOUTHEAST) {
					this._dir = Game.Direction.EAST;
				}
				else if(this._dir === Game.Direction.WEST ||
						this._dir === Game.Direction.NORTHWEST ||
						this._dir === Game.Direction.SOUTHWEST) {
					this._dir = Game.Direction.WEST;
				}
				else {
					this._dir = Game.Direction.NONE;
				}
				break;
		}
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
		this._setDir(state.dir);
		this._color = state.color;
	};

	return GamePlayer;
})();

if(typeof module !== "undefined" && typeof module.exports !== "undefined") {
	module.exports = CircleGame;
}