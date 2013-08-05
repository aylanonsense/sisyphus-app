var GameLib = require('./public/javascripts/gamecommon');
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
	this._players = {};
	this._playerIds = [];
	this._receiveCallbacks = [];
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
		self._receiveCallbacks.forEach(function(callback) {
			callback(playerId, message);
		});
	});
	this._players[playerId].onDisconnect(function() {
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
ServerNetworkHandler.prototype.send = function(playerId, message) {
	this._players[playerId].send(message);
};
ServerNetworkHandler.prototype.sendToAll = function(message) {
	for(var i = 0; i < this._playerIds.length; i++) {
		this._players[this._playerIds[i]].send(message);
	}
};
ServerNetworkHandler.prototype.sendToAllExcept = function(playerId, message) {
	for(var i = 0; i < this._playerIds.length; i++) {
		if(this._playerids[i] !== playerId) {
			this._players[this._playerIds[i]].send(message);
		}
	}
};
ServerNetworkHandler.prototype.onReceive = function(callback) {
	this._receiveCallbacks.push(callback);
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