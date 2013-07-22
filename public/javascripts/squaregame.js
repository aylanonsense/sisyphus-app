var SquareGame = (function() {
	function SquareGame() {
		this._squares = [];
		this._mySquareId = null;
		this._networkHandler = null;
	}
	SquareGame.prototype.update = function(ms) {
		this._squares.forEach(function(square) {
			square.update(ms);
		});
	};
	SquareGame.prototype.receiveCommand = function(command) {
		var action = null;
		var prediction = null;
		switch(command.type) {
			case 'startMoving':
				action = this._receiveStartMovingCommand(command);
				break;
			case 'stopMoving':
				action = this._receiveStopMovingCommand(command);
				break;
			case 'confirm':
				action = this._receiveConfirmCommand(command);
				break;
		}
		if(action !== null) {
			if(action.canPredict === false) {
				this._networkHandler.sendAction(action, null);
			}
			else {
				prediction = this.receiveAction(action);
				this._networkHandler.sendAction(action, prediction);
			}
		}
	};
	SquareGame.prototype._receiveStartMovingCommand = function(command) {
		var square = null;
		if(this._mySquareId !== null) {
			return {
				type: 'startMoving',
				squareId: this._mySquareId,
				dir: command.dir
			};
		}
		return null;
	};
	SquareGame.prototype._receiveStopMovingCommand = function(command) {
		if(this._mySquareId !== null) {
			return {
				type: 'stopMoving',
				squareId: this._mySquareId,
				dir: command.dir
			};
		}
		return null;
	};
	SquareGame.prototype._receiveConfirmCommand = function(command) {
		if(this._mySquareId === null) {
			return {
				type: 'spawn',
				canPredict: false
			};
		}
		return null;
	};
	SquareGame.prototype.receiveAction = function(action) {
		switch(action.type) {
			case 'startMoving': return this._receiveStartMovingAction(action);
			case 'stopMoving': return this._receiveStopMovingAction(action);
			case 'spawn': return this._receiveSpawnAction(action);
		}
		return null;
	};
	SquareGame.prototype._receiveStartMovingAction = function(action) {
		var square = this._getSquare(action.squareId);
		square.startMoving(action.dir);
		return square.getState('movement');
	};
	SquareGame.prototype._receiveStopMovingAction = function(action) {
		var square = this._getSquare(action.squareId);
		square.stopMoving(action.dir);
		return square.getState('movement');
	};
	SquareGame.prototype._receiveSpawnAction = function(action) {
		var square = this._createSquare(action.squareId, action.square);
		if(action.isOwner) {
			this._mySquareId = action.squareId;
		}
		return square.getState();
	};
	SquareGame.prototype._getSquare = function(id) {
		for(var i = 0; i < this._squares.length; i++) {
			if(this._squares[i].getId() === id) {
				return this._squares[i];
			}
		}
		return null;
	};
	SquareGame.prototype._createSquare = function(id, state) {
		var square = new SquareEntity(id, state);
		this._squares.push(square);
		return square;
	};
	SquareGame.prototype.setNetworkHandler = function(networkHandler) {
		this._networkHandler = networkHandler;
	};
	SquareGame.prototype.getState = function(parts) {
		parts = (parts || 'all');
		return {
			squares: this._squares.map(function(square) {
				return square.getState(parts);
			})
		};
	};
	SquareGame.prototype.getRenderableState = function() {
		return this.getState('render');
	};
	SquareGame.prototype.updateState = function(state) {
		state.squares.forEach(function(state) {
			var square = _getSquare(state.id);
			if(square === null) {
				_createSquare(state.id, state);
			}
			else {
				square.updateState(state);
			}
		});
	};



	function SquareEntity(id, state) {
		this._id = id;
		this._x = 0;
		this._y = 0;
		this._color = 'black';
		this._horizontalMove = 0;
		this._verticalMove = 0;
		if(state) {
			this.updateState(state);
		}
	}
	SquareEntity.MOVE_SPEED = 150;
	SquareEntity.DIAGONAL_MOVE_SPEED = SquareEntity.MOVE_SPEED / Math.sqrt(2);
	SquareEntity.prototype.getId = function() {
		return this._id;
	};
	SquareEntity.prototype.startMoving = function(dir) {
		switch(dir) {
			case 'up':
				this._verticalMove = -1;
				break;
			case 'down':
				this._verticalMove = 1;
				break;
			case 'left':
				this._horizontalMove = -1;
				break;
			case 'right':
				this._horizontalMove = 1;
				break;
		}
	};
	SquareEntity.prototype.stopMoving = function(dir) {
		switch(dir) {
			case 'up':
				this._verticalMove = (this._verticalMove === 1 ? 1 : 0);
				break;
			case 'down':
				this._verticalMove = (this._verticalMove === -1 ? -1 : 0);
				break;
			case 'left':
				this._horizontalMove = (this._horizontalMove === 1 ? 1 : 0);
				break;
			case 'right':
				this._horizontalMove = (this._horizontalMove === -1 ? -1 : 0);
				break;
		}
	};
	SquareEntity.prototype.update = function(ms) {
		var moveSpeed = SquareEntity.MOVE_SPEED;
		if(this._horizontalMove !== 0 && this._verticalMove !== 0) {
			moveSpeed = SquareEntity.DIAGONAL_MOVE_SPEED;
		}
		this._x += this._horizontalMove * moveSpeed * ms / 1000;
		this._y += this._verticalMove * moveSpeed * ms / 1000;
	};
	SquareEntity.prototype.getState = function(parts) {
		switch(parts) {
			case 'render':
				return {
					type: 'square',
					id: this._id,
					x: this._x,
					y: this._y,
					color: this._color
				};
			case 'movement':
				return {
					type: 'square',
					id: this._id,
					hori: this._horizontalMove,
					vert: this._verticalMove
				};
			default:
				return {
					type: 'square',
					id: this._id,
					x: this._x,
					y: this._y,
					color: this._color,
					hori: this._horizontalMove,
					vert: this._verticalMove
				};
		}
	};
	SquareEntity.prototype.updateState = function(state) {
		if(state.x) this._x = state.x;
		if(state.y) this._y = state.y;
		if(state.color) this._color = state.color;
		if(state.hori) this._horizontalMove = state.hori;
		if(state.vert) this._verticalMove = state.vert;
	};



	return SquareGame;
})();

if(typeof module !== "undefined" && typeof module.exports !== "undefined") {
	module.exports = SquareGame;
}