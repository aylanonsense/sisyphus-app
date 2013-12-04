if (typeof define !== 'function') { var define = require('amdefine')(module); }
define([ 'net/ServerConnectionPool' ], function(ServerConnectionPool) {
	function ExampleServer(app) {
		this._pool = new ServerConnectionPool(app);
		this._connectionNum = 0;
		this._bindEvents();
	}
	ExampleServer.prototype._bindEvents = function() {
		this._pool.onConnected(this, this._bindConnectionEvents);
	};
	ExampleServer.prototype._bindConnectionEvents = function(conn) {
		var n = this._connectionNum++;
		conn.whenConnected(this, function() {
			console.log("Client " + n + " connected!");
		});
		conn.whenDisconnected(this, function(reason) {
			console.log("Client " + n + " disconnected!");
		});
		conn.onReceive(this, function(message) {
			console.log("<- Received from client " + n + ":", message);
		});
		setInterval(function() {
			console.log("Client " + n + " ping: " + conn.getPing());
		}, 1000);
	};
	ExampleServer.prototype.start = function() {
		console.log("Starting server");
		this._pool.start();
	};
	ExampleServer.prototype.stop = function() {
		this._pool.stop();
	};

	return ExampleServer;
});