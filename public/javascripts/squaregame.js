var SquareGame = (function() {



	function SquareGame() {
		this._entities = [];
		this._shadows = [];
	}
	SquareGame.prototype.getEntity = function(entityId) {
		for(var i = 0; i < this._entities.length; i++) {
			if(this._entities[i].getId() === entityId) {
				return this._entities[i];
			}
		}
		return null;
	};
	SquareGame.prototype.receiveAction = function(action) {
		switch(action.type) {
			case 'START_MOVING_ENTITY': this._receiveStartMovingEntityAction(action.entityId, action.x, action.y, action.dir); break;
			case 'STOP_MOVING_ENTITY': this._receiveStopMovingEntityAction(action.entityId, action.x, action.y, action.dir); break;
			case 'SPAWN_ENTITY': this._receiveSpawnEntityAction(action.entityId, action.entityState); break;
			case 'UPDATE_SHADOWS': this._receiveUpdateShadowsAction(action.shadows); break;
		}
	};
	SquareGame.prototype._receiveStartMovingEntityAction = function(entityId, x, y, dir) {
		this.getEntity(entityId).startMoving(dir);
		this.getEntity(entityId).setState({ x: x, y: y });
	};
	SquareGame.prototype._receiveStopMovingEntityAction = function(entityId, x, y, dir) {
		this.getEntity(entityId).stopMoving(dir);
		this.getEntity(entityId).setState({ x: x, y: y });
	};
	SquareGame.prototype._receiveSpawnEntityAction = function(entityId, entityState) {
		var entity = new SquareGameEntity(entityId);
		entity.setState(entityState);
		this._entities.push(entity);
	};
	SquareGame.prototype._receiveUpdateShadowsAction = function(shadows) {
		this._shadows = shadows.map(function(shadowState) {
			var entity = new SquareGameEntity(shadowState.id);
			shadowState.hori = 0;
			shadowState.vert = 0;
			entity.setState(shadowState);
			return entity;
		});
	};
	SquareGame.prototype.update = function(ms) {
		this._entities.forEach(function(entity) {
			entity.update(ms);
		});
		this._shadows.forEach(function(shadow) {
			shadow.update(ms);
		});
	};
	SquareGame.prototype.getState = function() {
		return {
			entities: this._entities.map(function(entity) {
				return entity.getState();
			}),
			shadows: this._shadows.map(function(shadow) {
				return shadow.getState();
			})
		};
	};
	SquareGame.prototype.setState = function(state) {
		this._entities = state.entities.map(function(entityState) {
			var entity = new SquareGameEntity(entityState.id);
			entity.setState(entityState);
			return entity;
		});
		this._shadows = state.shadows.map(function(shadowState) {
			var entity = new SquareGameEntity(shadowState.id);
			entity.setState(shadowState);
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
			case 'UP': this._verticalMove = -1; break;
			case 'DOWN': this._verticalMove = 1; break;
			case 'LEFT': this._horizontalMove = -1; break;
			case 'RIGHT': this._horizontalMove = 1; break;
		}
	};
	SquareGameEntity.prototype.stopMoving = function(dir) {
		switch(dir) {
			case 'UP': this._verticalMove = (this._verticalMove === 1 ? 1 : 0); break;
			case 'DOWN': this._verticalMove = (this._verticalMove === -1 ? -1 : 0); break;
			case 'LEFT': this._horizontalMove = (this._horizontalMove === 1 ? 1 : 0); break;
			case 'RIGHT': this._horizontalMove = (this._horizontalMove === -1 ? -1 : 0); break;
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