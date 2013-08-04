var CircleGame = require('./public/javascripts/circlegame');



function ServerRunner() {
	this._game = new CircleGame({
		maxRewind: 500,
		stateStorageFreq: 250
	});
	this._networkHandler = new ServerNetworkHandler();
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



function ServerNetworkHandler() {
	this._nextPlayerId = 1;
	this._players = [];
	this._room = 'CIRCLE_GAME_' + (ServerNetworkHandler.prototype.NEXT_GAME_ID++);
}
ServerNetworkHandler.prototype.NEXT_GAME_ID = 1;
ServerNetworkHandler.prototype._getPlayer = function(playerId) {
	for(var i = 0; i < this._players.length; i++) {
		if(this._players[i].getId() === playerId) {
			return this._players[i];
		}
	}
	return null;
};
ServerNetworkHandler.prototype._removeConnection = function(playerId) {
	for(var i = 0; i < this._players.length; i++) {
		if(this._players[i].getId() === playerId) {
			this._players[i].getConnection().io.leave(this._room);
			this._players.splice(i, 1);
			return;
		}
	}
};
ServerNetworkHandler.prototype.onConnected = function(conn) {
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
ServerNetworkHandler.prototype._receivePing = function(id, ping, playerId) {
	var player = this._getPlayer(playerId);
	player.stopPingTimer(id);
	player.getConnection().io.emit('PING_RESPONSE', { id: id, ping: player.getPing() });
};
ServerNetworkHandler.prototype.send = function(messageType, message, playerId) {
	this._getPlayer(playerId).getConnection().io.emit(messageType, message);
};
ServerNetworkHandler.prototype.sendToAll = function(messageType, message) {
	if(this._players.length > 0) {
		this._players[0].getConnection().io.emit(messageType, message);
		this._players[0].getConnection().io.room(this._room).broadcast(messageType, message);
	}
};
ServerNetworkHandler.prototype.sendToAllExcept = function(messageType, message, playerId) {
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



function Connection(id, socket) {
	var self = this;
	this._id = id;
	this._pings = [];
	this._lastPingId = null;
	this._lastPingTime = null;
	this._nextPingId = 0;
	this._socket = socket;
	this._socket.on('PING', function(message) {
		if(self._lastPingId === message.id) {
			self._pings.push(Date.now() - self._lastPingTime);
			if(self._pings.length > 4) {
				self._pings.shift();
			}
			self._lastPingId = null;
			self._lastPingTime = null;
		}
		self.send('PING_RESPONSE', { id: message.id, ping: self.getPing() });
	});
}
Connection.prototype.getId = function() {
	return this._id;
};
Connection.prototype.getPing = function() {
	switch(this._pings.length) {
		case 1: return Math.floor(1.00 * this._pings[0]);
		case 2: return Math.floor(0.67 * this._pings[1] + 0.33 * this._pings[0]);
		case 3: return Math.floor(0.54 * this._pings[2] + 0.27 * this._pings[1] + 0.19 * this._pings[0]);
		case 4: return Math.floor(0.50 * this._pings[3] + 0.25 * this._pings[2] + 0.15 * this._pings[1] + 0.10 * this._pings[0]);
	}
	return 0;
};
Connection.prototype.send = function(messageType, message) {
	this._socket.io.emit(messageType, message);
};
Connection.prototype.sendToRoom = function(messageType, message, room) {
	this._socket.io.room(room).broadcast(messageType, message);
};
Connection.prototype.ping = function() {
	this._lastPingId = this._nextPingId++;
	this._lastPingTime = Date.now();
	this.send('PING_REQUEST', { id: this._lastPingId });
};
Connection.prototype.on = function(messageType, callback) {
	this._socket.on(messageType, callback);
};



module.exports = ServerRunner;