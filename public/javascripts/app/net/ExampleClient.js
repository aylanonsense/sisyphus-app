if (typeof define !== 'function') { var define = require('amdefine')(module); }
define([ 'net/ClientConnection' ], function(ClientConnection) {
	function ExampleClient() {
		this._conn = new ClientConnection();
		this._bindEvents();
	}
	ExampleClient.prototype._bindEvents = function() {
		var self = this;
		setInterval(function() {
			console.log("Ping: " + self._conn.getPing());
		}, 1000);
		this._conn.onReceive(this, function(message) {
			console.log("<- Received:", message);
		});
		this._conn.whenConnected(this, function() {
			console.log("Connected!");
		});
		this._conn.whenDisconnected(this, function() {
			console.log("Disconnected!");
		});
	};
	ExampleClient.prototype.connect = function() {
		console.log("Connecting...");
		this._conn.connect();
	};

	return ExampleClient;
});