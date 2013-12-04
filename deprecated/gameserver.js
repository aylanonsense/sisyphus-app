var GameCommon = require('./public/javascripts/gamecommon');
var GamePlayer = GameCommon.GamePlayer;
var Game = GameCommon.Game;
var Connection = GameCommon.Connection;
var DelayCalculator = GameCommon.DelayCalculator;

/*
	GameRunner
		start()
		stop()
	PlayerHandler
		getPlayer()
		addPlayer()
		removePlayer()
	Player
		getDelay()
		addDelay()
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
	this._players = new PlayerHandler();

	this._networkHandler.onConnect(function(playerId) {
		console.log("Player " + playerId + " connected!");
		var state = self._gamePlayer.getState();
		var time = self._gamePlayer.getTime();
		self._players.addPlayer(playerId);
		self._networkHandler.sendState(playerId, state, time);
	});
	this._networkHandler.onDisconnect(function(playerId) {
		console.log("Player " + playerId + " disconnected!");
		self._players.removePlayer(playerId);
	});
	this._networkHandler.onReceiveCommand(function(playerId, command, clientTime) {
		var serverTime = self._gamePlayer.getSplitSecondTime();
		var player = self._players.getPlayer(playerId);
		player.addDelay(serverTime - clientTime);
		self._controller.handleCommand(playerId, command, clientTime);// + player.getDelay());
	});
	this._controller.onDeltaGenerated(function(delta, time) {
		time = self._gamePlayer.handleDelta(delta, time);
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



function PlayerHandler() {
	this._players = [];
}
PlayerHandler.prototype.getPlayer = function(playerId) {
	return this._players[playerId];
};
PlayerHandler.prototype.addPlayer = function(playerId) {
	this._players[playerId] = new Player();
};
PlayerHandler.prototype.removePlayer = function(playerId) {
	delete this._players[playerId];
};



function Player() {
	this._delayCalc = new DelayCalculator({
		msBuffer: 15,
		maxSpikesToRaiseDelay: 4,
		minGainsToLowerDelay: 15,
		maxGainsToLowerDelay: 25
	});
}
Player.prototype.getDelay = function() {
	return this._delayCalc.getDelay();
};
Player.prototype.addDelay = function(delay) {
	this._delayCalc.addDelay(delay);
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
		}, 6000);
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
		},  6000);
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
	this._nextPlayerIndexToPing = 0;
	this._pingTimer = null;
}
NetworkHandler.prototype.addConnection = function(conn) {
	var self = this;
	var playerId = this._nextPlayerId++;
	var socket = new Socket(conn);
	this._playerIds.push(playerId);
	this._players[playerId] = new Connection({
		socket: socket,
		maxMessagesSentPerSecond: 10000,
		simulatedLag: {
			min: 80,
			max: 120,
			spikeChance: 0.03
		}
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
	if(this._playerIds.length === 1) {
		this._startPinging();
	}
};
NetworkHandler.prototype._removePlayer = function(playerId) {
	for(var i = 0; i < this._playerIds.length; i++) {
		if(this._playerIds[i] === playerId) {
			this._playerIds.splice(i, 1);
			if(this._nextPlayerIndexToPing > i) {
				this._nextPlayerIndexToPing--;
			}
			else if(this._nextPlayerIndexToPing >= this._playerIds.length) {
				this._nextPlayerIndexToPing = 0;
			}
			if(this._playerIds.length === 0) {
				this._stopPinging();
			}
			break;
		}
	}
	delete this._players[playerId];
};
NetworkHandler.prototype._send = function(playerId, message) {
	this._players[playerId].send(message);
};
NetworkHandler.prototype._startPinging = function() {
	this._nextPlayerIndexToPing = 0;
	this._pingNext();
};
NetworkHandler.prototype._stopPinging = function() {
	if(this._pingTimer !== null) {
		clearTimeout(this._pingTimer);
	}
	this._pingTimer = null;
};
NetworkHandler.prototype._pingNext = function() {
	if(this._pingTimer !== null) {
		clearTimeout(this._pingTimer);
	}
	var self = this;
	var ms = Math.max(125, 1250 / this._playerIds.length);
	this._ping(this._playerIds[this._nextPlayerIndexToPing]);
	this._nextPlayerIndexToPing++;
	if(this._nextPlayerIndexToPing >= this._playerIds.length) {
		this._nextPlayerIndexToPing = 0;
	}
	this._pingTimer = setTimeout(function() {
		self._pingTimer = null;
		self._pingNext();
	}, ms);
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
NetworkHandler.prototype._ping = function(playerId) {
	this._players[playerId].ping();
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