var GameLib = require('./public/javascripts/gamecommon');
var CircleGame = require('./public/javascripts/circlegame');



function ServerRunner() {
	this._game = new CircleGame({
		maxRewind: 500,
		stateStorageFreq: 250
	});
	this._networkHandler = new OldServerNetworkHandler();
	/*this._controller = new SquareGameServerController(this._game, this._networkHandler);
	this._networkHandler.setController(this._controller);*/
	this._timer = null;
}
ServerRunner.prototype.start = function() {
	console.log("Circle game server running...");
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
ServerRunner.prototype._update = function(ms) {
	this._game.update(ms);
};
ServerRunner.prototype.stop = function() {
	if(this._timer !== null) {
		clearInterval(this._timer);
		this._timer = null;
	}
};
ServerRunner.prototype.onConnected = function(conn) {
	this._networkHandler.onConnected(conn);
};



function OldServerNetworkHandler() {
	this._nextPlayerId = 1;
	this._players = [];
	this._room = 'CIRCLE_GAME_' + (OldServerNetworkHandler.prototype.NEXT_GAME_ID++);
}
OldServerNetworkHandler.prototype.NEXT_GAME_ID = 1;
OldServerNetworkHandler.prototype._getPlayer = function(playerId) {
	for(var i = 0; i < this._players.length; i++) {
		if(this._players[i].getId() === playerId) {
			return this._players[i];
		}
	}
	return null;
};
OldServerNetworkHandler.prototype._removeConnection = function(playerId) {
	for(var i = 0; i < this._players.length; i++) {
		if(this._players[i].getId() === playerId) {
			this._players[i].getConnection().io.leave(this._room);
			this._players.splice(i, 1);
			return;
		}
	}
};
OldServerNetworkHandler.prototype.onConnected = function(conn) {
	var self = this;
	var playerId = this._nextPlayerId++;
	console.log("Player " + playerId + " joined");
	this._players.push(new ServerNetworkConnection(playerId, conn));
	conn.io.join(this._room);
	conn.socket.on('PING', function(data) {
		self._receivePing(data.id, data.ping, playerId);
	});
	conn.socket.on('disconnect', function() {
		self._removeConnection(playerId);
	});
};
OldServerNetworkHandler.prototype._receivePing = function(id, ping, playerId) {
	var player = this._getPlayer(playerId);
	player.stopPingTimer(id);
	player.getConnection().io.emit('PING_RESPONSE', { id: id, ping: player.getPing() });
};
OldServerNetworkHandler.prototype.send = function(messageType, message, playerId) {
	this._getPlayer(playerId).getConnection().io.emit(messageType, message);
};
OldServerNetworkHandler.prototype.sendToAll = function(messageType, message) {
	if(this._players.length > 0) {
		this._players[0].getConnection().io.emit(messageType, message);
		this._players[0].getConnection().io.room(this._room).broadcast(messageType, message);
	}
};
OldServerNetworkHandler.prototype.sendToAllExcept = function(messageType, message, playerId) {
	this._getPlayer(playerId).getConnection().io.room(this._room).broadcast(messageType, message);
};



function ServerNetworkConnection(id, conn) {
	this._id = id;
	this._conn = conn;
	this._pings = [];
	this._lastPing = { id: null, time: null };
	this._nextPingId = 0;
}
ServerNetworkConnection.prototype.getId = function() {
	return this._id;
};
ServerNetworkConnection.prototype.getConnection = function() {
	return this._conn;
};
ServerNetworkConnection.prototype.getPing = function() {
	switch(this._pings.length) {
		case 1: return Math.floor(1.00 * this._pings[0]);
		case 2: return Math.floor(0.67 * this._pings[1] + 0.33 * this._pings[0]);
		case 3: return Math.floor(0.54 * this._pings[2] + 0.27 * this._pings[1] + 0.19 * this._pings[0]);
		case 4: return Math.floor(0.50 * this._pings[3] + 0.25 * this._pings[2] + 0.15 * this._pings[1] + 0.10 * this._pings[0]);
	}
	return 0;
};
ServerNetworkConnection.prototype.startPingTimer = function() {
	var pingId = this._nextPingId++;
	this._lastPing = { id: pingId, time: Date.now() };
	return pingId;
};
ServerNetworkConnection.prototype.stopPingTimer = function(id) {
	if(id === this._lastPing.id) {
		this._updatePing(Date.now() - this._lastPing.time);
		this._lastPing = { id: null, time: null };
	}
};
ServerNetworkConnection.prototype._updatePing = function(ping) {
	this._pings.push(ping);
	if(this._pings.length > 4) {
		this._pings.shift();
	}
};



function ServerNetworkHandler() {
	this._nextPlayerId = 1;
	this._players = {};
	this._playerIds = [];
}
ServerNetworkHandler.prototype.onConnected = function(conn) {
	var self = this;
	var playerId = this._nextPlayerId++;
	var socket = new Socket(conn);
	this._playerIds.push(playerId);
	this._players[playerId] = new GameLib.Connection({
		socket: socket,
		maxMessagesSentPerSecond: 10,
		maxDelayBeforeSending: 100
	});
	this._players[playerId].onReceive(function(message) {
		//TODO hand off to receiver
	});
	this.players[playerId].onDisconnect(function() {
		self._removePlayer(playerId);
	});
	console.log("Player " + playerId + " joined");
};
ServerNetworkHandler.prototype._removePlayer = function(playerId) {
	for(var i = 0; i < this._playerIds.length; i++) {
		if(this._playerIds[i] === playerId) {
			this._playerIds.splice(i, 1);
			break;
		}
	}
	delete this._players[playerId];
	console.log("Player " + playerId + " left");
};
ServerNetworkHandler.prototype.send = function(message, playerId) {
	this._players[playerId].send(message);
};
ServerNetworkHandler.prototype.sendToAll = function(message) {
	for(var i = 0; i < this._playerIds.length; i++) {
		this._players[this._playerIds[i]].send(message);
	}
};
ServerNetworkHandler.prototype.sendToAllExcept = function(message, playerId) {
	for(var i = 0; i < this._playerIds.length; i++) {
		if(this._playerids[i] !== playerId) {
			this._players[this._playerIds[i]].send(message);
		}
	}
};



function Socket(conn) {
	this._conn = conn;
}
Socket.prototype.emit = function(messageType, message) {
	this._conn.io.emit(messageType, message);
};
Socket.prototype.on = function(messageType, callback) {
	this._conn.socket.on(messageType, callback);
};



module.exports = ServerRunner;