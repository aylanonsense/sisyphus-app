if (typeof define !== 'function') { var define = require('amdefine')(module); }
define([ 'net/ClientConnection' ], function(ClientConnection) {
	function ExampleClient() {
		var self = this;
		var sendTimer;
		this._conn = new ClientConnection();
		this._conn.onReceive(this, function(message) {
			console.log("<- Received:", message, "(" + this._conn.getPing() + ")");
		});
		this._conn.whenConnected(this, function() {
			console.log("Connected!");
		});
		this._conn.whenDisconnected(this, function() {
			console.log("Disconnected!");
			clearInterval(sendTimer);
		});
	}
	ExampleClient.prototype.connect = function() {
		console.log("Connecting...");
		this._conn.connect();
	};

	return ExampleClient;
});