var GameCommon = require('./public/javascripts/gamecommon');
var GamePlayer = GameCommon.GamePlayer;
var Game = GameCommon.Game;
var Connection = GameCommon.Connection;
var debug = false;

/*
	GameRunner
		start()
		stop()
	Controller
		handleCommand(playerId, command, time)
		onDeltaGenerated(callback)
	NetworkHandler
		addConnection(conn)
		sendDelta(playerId, delta, time)
		sendDeltaToAll(delta, time)
		sendDeltaToAllExcept(playerId, delta, time)
		onConnect(callback)
		onDisconnect(callback)
		onReceiveCommand(callback)
	Socket
		emit(mesageType, message)
		on(messageType, callback)
*/

function GameRunner() {
	var self = this;
	this._timer = null;
	this._gamePlayer = new GamePlayer({ maxRewind: 0 });
	this._networkHandler = new NetworkHandler();
	this._controller = new Controller();

	this._networkHandler.onConnect(function(playerId) {
		console.log("Player " + playerId + " connected!");
		var state = self._gamePlayer.getState();
		var time = self._gamePlayer.getTime();
		if(debug) {
			console.log("Sending state at time " + time + ":");
			console.log(state);
		}
		self._networkHandler.sendState(playerId, state, time);
	});
	this._networkHandler.onDisconnect(function(playerId) {
		console.log("Player " + playerId + " disconnected!");
	});
	this._networkHandler.onReceiveCommand(function(playerId, command, time) {
		if(debug) console.log("Received command from player" + playerId + " at " + time + ":", command);
		self._controller.handleCommand(playerId, command, time);
	});
	this._controller.onDeltaGenerated(function(delta, time) {
		time = self._gamePlayer.handleDelta(delta, time);
		if(debug) {
			console.log("Sending delta at time " + time + ":");
			console.log(delta);
		}
		self._networkHandler.sendDeltaToAll(delta, time);
	});
}
GameRunner.prototype.start = function() {
	console.log("Game server running...");
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
GameRunner.prototype._update = function(ms) {
	this._gamePlayer.update(ms);
};
GameRunner.prototype.stop = function() {
	if(this._timer !== null) {
		clearInterval(this._timer);
		this._timer = null;
	}
};
GameRunner.prototype.onConnected = function(conn) {
	this._networkHandler.addConnection(conn);
};



function Controller() {
	this._deltaCallbacks = [];
}
Controller.prototype.handleCommand = function(playerId, command, time) {
	if(command.type === 'SET_MY_DIR') {
		this._fireDelta({
			type: 'SET_ENTITY_DIR',
			entityId: 100 + playerId,
			horizontal: command.horizontal,
			vertical: command.vertical
		}, time);
	}
	else if(command.type === 'SPAWN_ME') {
		this._fireDelta({
			type: 'SPAWN_ENTITY',
			state: {
				id: 100 + playerId,
				x: 200,
				y: 200,
				horizontal: 0,
				vertical: 0,
				color: (Math.random() < 0.5 ? 'orange' : 'green')
			}
		}, time);
	}
};
Controller.prototype._fireDelta = function(delta, time) {
	this._deltaCallbacks.forEach(function(callback) {
		callback(delta, time);
	});
};
Controller.prototype.onDeltaGenerated = function(callback) {
	this._deltaCallbacks.push(callback);
};



function NetworkHandler() {
	this._nextPlayerId = 1;
	this._players = {};
	this._playerIds = [];
	this._connectCallbacks = [];
	this._disconnectCallbacks = [];
	this._receiveCommandCallbacks = [];
}
NetworkHandler.prototype.addConnection = function(conn) {
	var self = this;
	var playerId = this._nextPlayerId++;
	var socket = new Socket(conn);
	this._playerIds.push(playerId);
	this._players[playerId] = new Connection({
		socket: socket,
		maxMessagesSentPerSecond: 10
	});
	this._players[playerId].onReceive(function(message) {
		if(message.type === 'COMMAND') {
			self._receiveCommandCallbacks.forEach(function(callback) {
				callback(playerId, message.command, message.time);
			});
		}
	});
	this._players[playerId].onDisconnect(function() {
		self._removePlayer(playerId);
		self._disconnectCallbacks.forEach(function(callback) {
			callback(playerId);
		});
	});
	this._connectCallbacks.forEach(function(callback) {
		callback(playerId);
	});
};
NetworkHandler.prototype._removePlayer = function(playerId) {
	for(var i = 0; i < this._playerIds.length; i++) {
		if(this._playerIds[i] === playerId) {
			this._playerIds.splice(i, 1);
			break;
		}
	}
	delete this._players[playerId];
};
NetworkHandler.prototype._send = function(playerId, message) {
	this._players[playerId].send(message);
};
NetworkHandler.prototype._sendToAll = function(message) {
	for(var i = 0; i < this._playerIds.length; i++) {
		this._players[this._playerIds[i]].send(message);
	}
};
NetworkHandler.prototype._sendToAllExcept = function(playerId, message) {
	for(var i = 0; i < this._playerIds.length; i++) {
		if(this._playerIds[i] !== playerId) {
			this._players[this._playerIds[i]].send(message);
		}
	}
};
NetworkHandler.prototype.sendState = function (playerId, state, time) {
	this._send(playerId, this._wrapState(state, time));
};
NetworkHandler.prototype._wrapState = function(state, time) {
	return { type: 'STATE', state: state, time: time };
};
NetworkHandler.prototype.sendDeltaToAll = function(delta, time) {
	this._sendToAll(this._wrapDelta(delta, time));
};
NetworkHandler.prototype._wrapDelta = function(delta, time) {
	return { type: 'DELTA', delta: delta, time: time };
};
NetworkHandler.prototype.onConnect = function(callback) {
	this._connectCallbacks.push(callback);
};
NetworkHandler.prototype.onDisconnect = function(callback) {
	this._disconnectCallbacks.push(callback);
};
NetworkHandler.prototype.onReceiveCommand = function(callback) {
	this._receiveCommandCallbacks.push(callback);
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



module.exports = GameRunner;