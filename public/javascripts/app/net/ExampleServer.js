if (typeof define !== 'function') { var define = require('amdefine')(module); }
define([ 'net/ServerConnectionPool' ], function(ServerConnectionPool) {
	function ExampleServer(app) {
		this._NEXT_CONN_ID = 0;
		this._pool = new ServerConnectionPool(app);
		this._pool.onConnected(this, function(conn) {
			var connId = this._NEXT_CONN_ID++;
			conn.whenConnected(this, function() {
				console.log("Client " + connId + " connected!");
			});
			conn.whenDisconnected(this, function(reason) {
				console.log("Client " + connId + " disconnected!");
			});
			conn.onReceive(this, function(message) {
				console.log("<- Received from client " + connId + ":", message, "(" + conn.getPing() + ")");
				console.log("-> Sending to client " + connId + ":   ", message + ' echo');
				conn.send(message + ' echo');
			});
		});
	}
	ExampleServer.prototype.start = function() {
		console.log("Starting server");
		this._pool.startAcceptingConnections();
	};
	ExampleServer.prototype.stop = function() {
		this._pool.stopAcceptingConnections();
	};

	return ExampleServer;
});