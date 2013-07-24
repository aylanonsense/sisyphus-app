var SquareGame = require('./public/javascripts/squaregame');
var debug = true;



function SquareGameServerRunner() {
	this._game = new SquareGame();
	this._networkHandler = new SquareGameServerNetworkHandler();
	this._controller = new SquareGameServerController(this._game, this._networkHandler);
	this._networkHandler.setController(this._controller);
	this._timer = null;
}
SquareGameServerRunner.prototype.start = function() {
	var self, now, then;
	if(this._timer === null) {
		self = this;
		then = now = Date.now();
		this.timer = setInterval(function() {
			now = Date.now();
			self._update(now - then);
			then = now;
		}, 33);
	}
};
SquareGameServerRunner.prototype._update = function(ms) {
	this._game.update(ms);
};
SquareGameServerRunner.prototype.stop = function() {
	if(this._timer !== null) {
		clearInterval(this._timer);
		this._timer = null;
	}
};
SquareGameServerRunner.prototype.onConnected = function(conn) {
	this._networkHandler.onConnected(conn);
};



function SquareGameServerController(game, networkHandler) {
	this._game = game;
	this._networkHandler = networkHandler;
	this._players = [];
}
SquareGameServerController.prototype.playerJoined = function(playerId) {
	if(debug) console.log("Player " + playerId + " joined");
	this._players.push(new SquareGamePlayer(playerId));
	this._networkHandler.sendState(this._game.getState(), playerId);
};
SquareGameServerController.prototype._getPlayer = function(playerId) {
	for(var i = 0; i < this._players.length; i++) {
		if(this._players[i].getId() === playerId) {
			return this._players[i];
		}
	}
	return null;
};
SquareGameServerController.prototype.receiveCommand = function(command, playerId) {
	switch(command.type) {
		case 'START_MOVING_PLAYER': this._receiveStartMovingPlayerCommand(command.dir, playerId); break;
		case 'STOP_MOVING_PLAYER': this._receiveStopMovingPlayerCommand(command.dir, playerId); break;
		case 'SPAWN_PLAYER': this._receiveSpawnPlayerCommand(playerId); break;
	}
};
SquareGameServerController.prototype._receiveStartMovingPlayerCommand = function(dir, playerId) {
	var action = {
		type: 'START_MOVING_ENTITY',
		entityId: this._getPlayer(playerId).getEntityId(),
		dir: dir
	};
	this._game.receiveAction(action);
	this._networkHandler.sendActionToAllExcept(action, playerId);
};
SquareGameServerController.prototype._receiveStopMovingPlayerCommand = function(dir, playerId) {
	var action = {
		type: 'STOP_MOVING_ENTITY',
		entityId: this._getPlayer(playerId).getEntityId(),
		dir: dir
	};
	this._game.receiveAction(action);
	this._networkHandler.sendActionToAllExcept(action, playerId);
};
SquareGameServerController.prototype._receiveSpawnPlayerCommand = function(playerId) {
	var action = {
		type: 'SPAWN_ENTITY',
		entityId: 100 + playerId,
		entityState: {
			x: Math.floor(400 * Math.random()),
			y: Math.floor(400 * Math.random()),
			color: ['red','blue','green','yellow','orange','purple','pink','black'][playerId%8],
			hori: 0,
			vert: 0
		},
		isOwner: false
	};
	this._getPlayer(playerId).setEntityId(action.entityId);
	this._game.receiveAction(action);
	this._networkHandler.sendActionToAllExcept(action, playerId);
	action.isOwner = true;
	this._networkHandler.sendAction(action, playerId);
};



function SquareGamePlayer(id) {
	this._id = id;
	this._entityId = null;
}
SquareGamePlayer.prototype.getId = function() {
	return this._id;
};
SquareGamePlayer.prototype.getEntityId = function() {
	return this._entityId;
};
SquareGamePlayer.prototype.setEntityId = function(entityId) {
	this._entityId = entityId;
};



function SquareGameServerNetworkHandler() {
	this._controller = null;
	this._nextPlayerId = 0;
	this._conns = {};
	this._room = 'square-game-0';
}
SquareGameServerNetworkHandler.prototype._getConnection = function(playerId) {
	return this._conns[playerId];
};
SquareGameServerNetworkHandler.prototype._removeConnection = function(playerId) {
	this._getConnection(playerId).io.leave(this._room);
	delete this._conns[playerId];
};
SquareGameServerNetworkHandler.prototype.setController = function(controller) {
	this._controller = controller;
};
SquareGameServerNetworkHandler.prototype.onConnected = function(conn) {
	var self = this;
	var playerId = this._nextPlayerId++;
	this._conns[playerId] = conn;
	this._controller.playerJoined(playerId);
	conn.io.join(this._room);
	conn.socket.on('command', function(data) {
		self.receiveCommand(data.command, playerId);
	});
	conn.socket.on('disconnect', function() {
		self._removeConnection(playerId);
	});
};
SquareGameServerNetworkHandler.prototype.receiveCommand = function(command, playerId) {
	this._controller.receiveCommand(command, playerId);
};
SquareGameServerNetworkHandler.prototype.sendAction = function(action, playerId) {
	this._getConnection(playerId).io.emit('action', { action: action });
};
SquareGameServerNetworkHandler.prototype.sendActionToAllExcept = function(action, playerId) {
	this._getConnection(playerId).io.room(this._room).broadcast('action', { action: action });
};
SquareGameServerNetworkHandler.prototype.sendState = function(state, playerId) {
	this._getConnection(playerId).io.emit('state', { state: state });
};



module.exports = SquareGameServerRunner;