var SquareGame = (function() {
	var debug = true;



	function SquareGame() {
		this._entities = [];
	}
	SquareGame.prototype._getEntity = function(entityId) {
		for(var i = 0; i < this._entities.length; i++) {
			if(this._entities[i].getId() === entityId) {
				return this._entities[i];
			}
		}
		return null;
	};
	SquareGame.prototype.receiveAction = function(action) {
		if(debug) console.log("action:", action);
		switch(action.type) {
			case 'START_MOVING_ENTITY': this._receiveStartMovingEntityAction(action.entityId, action.dir); break;
			case 'STOP_MOVING_ENTITY': this._receiveStopMovingEntityAction(action.entityId, action.dir); break;
			case 'SPAWN_ENTITY': this._recieveSpawnEntityAction(action.entityId, action.entityState); break;
		}
	};
	SquareGame.prototype._receiveStartMovingEntityAction = function(entityId, dir) {
		this._getEntity(entityId).startMoving(dir);
	};
	SquareGame.prototype._receiveStopMovingEntityAction = function(entityId, dir) {
		this._getEntity(entityId).stopMoving(dir);
	};
	SquareGame.prototype._recieveSpawnEntityAction = function(entityId, entityState) {
		var entity = new SquareGameEntity(entityId);
		entity.setState(entityState);
		this._entities.push(entity);
	};
	SquareGame.prototype.update = function(ms) {
		this._entities.forEach(function(entity) {
			entity.update(ms);
		});
	};
	SquareGame.prototype.getState = function() {
		return {
			entities: this._entities.map(function(entity) {
				return entity.getState();
			})
		};
	};
	SquareGame.prototype.setState = function(state) {
		console.log("state:", state);
		this._entities = state.entities.map(function(entityState) {
			var entity = new SquareGameEntity(entityState.id);
			entity.setState(entityState);
			return entity;
		});
	};



	function SquareGameEntity(id) {
		this._id = id;
		this._x = 0;
		this._y = 0;
		this._color = 'black';
		this._horizontalMove = 0;
		this._verticalMove = 0;
	}
	SquareGameEntity.MOVE_SPEED = 150;
	SquareGameEntity.DIAGONAL_MOVE_SPEED = SquareGameEntity.MOVE_SPEED / Math.sqrt(2);
	SquareGameEntity.prototype.getId = function() {
		return this._id;
	};
	SquareGameEntity.prototype.startMoving = function(dir) {
		switch(dir) {
			case 'up': this._verticalMove = -1; break;
			case 'down': this._verticalMove = 1; break;
			case 'left': this._horizontalMove = -1; break;
			case 'right': this._horizontalMove = 1; break;
		}
	};
	SquareGameEntity.prototype.stopMoving = function(dir) {
		switch(dir) {
			case 'up': this._verticalMove = (this._verticalMove === 1 ? 1 : 0); break;
			case 'down': this._verticalMove = (this._verticalMove === -1 ? -1 : 0); break;
			case 'left': this._horizontalMove = (this._horizontalMove === 1 ? 1 : 0); break;
			case 'right': this._horizontalMove = (this._horizontalMove === -1 ? -1 : 0); break;
		}
	};
	SquareGameEntity.prototype.update = function(ms) {
		var moveSpeed = SquareGameEntity.MOVE_SPEED;
		if(this._horizontalMove !== 0 && this._verticalMove !== 0) {
			moveSpeed = SquareGameEntity.DIAGONAL_MOVE_SPEED;
		}
		this._x += this._horizontalMove * moveSpeed * ms / 1000;
		this._y += this._verticalMove * moveSpeed * ms / 1000;
	};
	SquareGameEntity.prototype.getState = function() {
		return {
			id: this._id,
			x: this._x,
			y: this._y,
			color: this._color,
			hori: this._horizontalMove,
			vert: this._verticalMove
		};
	};
	SquareGameEntity.prototype.setState = function(state) {
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