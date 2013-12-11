if (typeof define !== 'function') { var define = require('amdefine')(module); }
define([ 'net/ServerConnectionPool', 'net/PriorityEnum', 'accord/ServerProps' ], function(ServerConnectionPool, PRIORITY, ServerProps) {
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
			});
		});
		var prop = new ServerProps(this._pool, {
			posX: {
				initially: 5,
				shared: true,
				sendChanges: false,
				sendPeriodicUpdates: true,
				timeBetweenPeriodicUpdates: 6000,
				priorityOfPeriodicUpdates: PRIORITY.LOW
			},
			velX: {
				initially: 10,
				shared: true,
				sendChanges: true,
				priorityOfChanges: PRIORITY.HIGH,
				sendPeriodicUpdates: false
			}
		});
		setInterval(function() {
			prop.checkForPeriodicUpdates();
		}, 100);
		setInterval(function() {
			prop.set('velX', Math.floor(10 * Math.random()));
		}, 1000);
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