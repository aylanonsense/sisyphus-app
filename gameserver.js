var gamelib = require('./public/javascripts/game');

function SquareGameServerRunner(params) {
	this._game = new gamelib.SquareGame();
	this._networkHandler = new ServerNetworkHandler(this._game);
	this._game.setNetworkHandler(this._networkHandler);
	this._timer = null;
}
SquareGameServerRunner.prototype.start = function() {
	var self, now, then;
	if(this._timer === null) {
		self = this;
		then = now = Date.now();
		this.update(0);
		this._timer = setInterval(function() {
			now = Date.now();
			self.update(now - then);
			then = now;
		}, 33);
	}
};
SquareGameServerRunner.prototype.stop = function() {
	if(this._timer !== null) {
		clearInterval(this._timer);
		this._timer = null;
	}
};
SquareGameServerRunner.prototype.update = function(ms) {
	this._game.update(ms);
};
SquareGameServerRunner.prototype.onJoin = function(req) {
	this._networkHandler.onJoin(req);
};



function ServerNetworkHandler(game) {
	this._game = game;
	this._nextConnId = 0;
	this._conns = {};
}
ServerNetworkHandler.prototype.onJoin = function(conn) {
	var connId = this._nextConnId++;
	this._game.playerJoined(connId);
	this._conns[connId] = conn;
	conn.socket.on('action', function(data) {
		//TODO route through game
		conn.io.emit('action', {
			action: {
				type: 'spawn',
				square: {
					id: 0,
					x: 200,
					y: 200,
					color: 'green'
				}
			}
		});
	});
	conn.io.emit('joined', { id: connId });
};
ServerNetworkHandler.prototype.sendAction = function(action, results, conn) {
	console.log("Server.sendAction(", action, ",", results, ")");
};



exports.SquareGameRunner = SquareGameServerRunner;