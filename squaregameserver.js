var SquareGame = require('./public/javascripts/squaregame');

function SquareGameServerRunner(params) {
	this._game = new SquareGame();
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
SquareGameServerRunner.prototype.onConnectRequested = function(req) {
	this._networkHandler.onConnectRequested(req);
};



function ServerNetworkHandler(game) {
	this._game = game;
	this._nextConnId = 0;
	this._conns = {};
}
ServerNetworkHandler.prototype.onConnectRequested = function(conn) {
	var action = null;
	var connId = this._nextConnId++;
	this._conns[connId] = conn;
	conn.socket.on('action', function(data) {
		if(data.action.type === 'spawn') {
			conn.io.emit('action', {
				//TODO move into some game authority
				action: {
					type: 'spawn',
					squareId: 0,
					square: {
						x: 400*Math.random(),
						y: 400*Math.random(),
						color: (Math.random() < 0.5 ? 'blue' : 'red')
					},
					isOwner: true
				}
			});
		}
	});
	conn.io.emit('connect-accepted', { id: connId });
	conn.io.emit('state', { state: this._game.getState() });
};
ServerNetworkHandler.prototype.sendAction = function(action, results, conn) {
	
};



module.exports = SquareGameServerRunner;