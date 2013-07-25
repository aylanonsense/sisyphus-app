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
	console.log("Square game server running...");
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
	this._controller.sendShadows();
	if(Math.random() < 0.03) {
		this._networkHandler.sendPingRequestToAll();
	}
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
	console.log("Player " + playerId + " joined");
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
SquareGameServerController.prototype.sendShadows = function() {
	this._networkHandler.sendActionToAll({
		type: 'UPDATE_SHADOWS',
		shadows: this._game.getState().entities //intentional!!
	});
};
SquareGameServerController.prototype.receiveCommand = function(command, playerId) {
	switch(command.type) {
		case 'START_MOVING_PLAYER': this._receiveStartMovingPlayerCommand(command.dir, playerId); break;
		case 'STOP_MOVING_PLAYER': this._receiveStopMovingPlayerCommand(command.dir, playerId); break;
		case 'SPAWN_PLAYER': this._receiveSpawnPlayerCommand(playerId); break;
	}
};
SquareGameServerController.prototype._receiveStartMovingPlayerCommand = function(dir, playerId) {
	var entity = this._game.getEntity(this._getPlayer(playerId).getEntityId());
	var action = {
		type: 'START_MOVING_ENTITY',
		entityId: entity.getId(),
		x: entity.getState().x,
		y: entity.getState().y,
		dir: dir
	};
	this._game.receiveAction(action);
	this._networkHandler.sendActionToAllExcept(action, playerId);
};
SquareGameServerController.prototype._receiveStopMovingPlayerCommand = function(dir, playerId) {
	var entity = this._game.getEntity(this._getPlayer(playerId).getEntityId());
	var action = {
		type: 'STOP_MOVING_ENTITY',
		entityId: entity.getId(),
		x: entity.getState().x,
		y: entity.getState().y,
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
	this._nextPlayerId = 1;
	this._players = [];
	this._room = 'square-game-0';
}
SquareGameServerNetworkHandler.prototype._getPlayer = function(playerId) {
	for(var i = 0; i < this._players.length; i++) {
		if(this._players[i].getId() === playerId) {
			return this._players[i];
		}
	}
	return null;
};
SquareGameServerNetworkHandler.prototype._removeConnection = function(playerId) {
	this._getPlayer(playerId).getConnection().io.leave(this._room);
	for(var i = 0; i < this._players.length; i++) {
		if(this._players[i].getId() === playerId) {
			this._players.splice(i, 1);
			return;
		}
	}
};
SquareGameServerNetworkHandler.prototype.setController = function(controller) {
	this._controller = controller;
};
SquareGameServerNetworkHandler.prototype.onConnected = function(conn) {
	var self = this;
	var playerId = this._nextPlayerId++;
	this._players.push(new RemotePlayer(playerId, conn));
	this._controller.playerJoined(playerId);
	conn.io.join(this._room);
	conn.socket.on('COMMAND', function(data) {
		self.receiveCommand(data.command, playerId);
	});
	conn.socket.on('PING', function(data) {
		self.receivePing(data.id, data.ping, playerId);
	});
	conn.socket.on('disconnect', function() {
		self._removeConnection(playerId);
	});
};
SquareGameServerNetworkHandler.prototype.receiveCommand = function(command, playerId) {
	this._controller.receiveCommand(command, playerId);
};
SquareGameServerNetworkHandler.prototype.receivePing = function(id, ping, playerId) {
	var player = this._getPlayer(playerId);
	player.stopPingTimer(id);
	player.getConnection().io.emit('PING_RESPONSE', { id: id, ping: player.getPing() });
	if(debug) console.log("Player " + playerId + " ping: " + Math.round(player.getPing()) + "ms");
};
SquareGameServerNetworkHandler.prototype.sendAction = function(action, playerId) {
	this._getPlayer(playerId).getConnection().io.emit('ACTION', { action: action });
};
SquareGameServerNetworkHandler.prototype.sendActionToAll = function(action) {
	if(this._players.length > 0) {
		this._players[0].getConnection().io.emit('ACTION', { action: action });
		this._players[0].getConnection().io.room(this._room).broadcast('ACTION', { action: action });
	}
};
SquareGameServerNetworkHandler.prototype.sendActionToAllExcept = function(action, playerId) {
	this._getPlayer(playerId).getConnection().io.room(this._room).broadcast('ACTION', { action: action });
};
SquareGameServerNetworkHandler.prototype.sendState = function(state, playerId) {
	this._getPlayer(playerId).getConnection().io.emit('STATE', { state: state });
};
SquareGameServerNetworkHandler.prototype.sendPingRequestToAll = function() {
	this._players.forEach(function(player) {
		var pingId = player.startPingTimer();
		player.getConnection().io.emit('PING_REQUEST', { id: pingId });
	});
};



function RemotePlayer(id, conn) {
	this._id = id;
	this._conn = conn;
	this._ping = null;
	this._lastPing = { id: null, time: null };
	this._nextPingId = 0;
}
RemotePlayer.prototype.getId = function() {
	return this._id;
};
RemotePlayer.prototype.getConnection = function() {
	return this._conn;
};
RemotePlayer.prototype.getPing = function() {
	return this._ping;
};
RemotePlayer.prototype.startPingTimer = function() {
	var pingId = this._nextPingId++;
	this._lastPing = { id: pingId, time: Date.now() };
	return pingId;
};
RemotePlayer.prototype.stopPingTimer = function(id) {
	if(id === this._lastPing.id) {
		this._updatePing(Date.now() - this._lastPing.time);
		this._lastPing = { id: null, time: null };
	}
};
RemotePlayer.prototype._updatePing = function(ping) {
	if(this._ping === null) {
		this._ping = ping;
	}
	else {
		this._ping = (3 * this._ping + ping) / 4;
	}
};



module.exports = SquareGameServerRunner;