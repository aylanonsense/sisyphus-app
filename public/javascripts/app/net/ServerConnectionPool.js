if (typeof define !== 'function') { var define = require('amdefine')(module); }
define([ 'net/ServerConnection' ], function(ServerConnection) {
	function ServerConnectionPool(app) {
		this._onConnectedCallbacks = [];
		this._isAcceptingConnections = false;
		this._bindConnectionEvents(app);
	}
	ServerConnectionPool.prototype._bindConnectionEvents = function(app) {
		var self = this;
		app.io.route('appjoinrequest', function(req) {
			self._fireConnectedEvent(req);
		});
	};
	ServerConnectionPool.prototype.start = function() {
		this._isAcceptingConnections = true;
	};
	ServerConnectionPool.prototype.stop = function() {
		this._isAcceptingConnections = false;
	};
	ServerConnectionPool.prototype.isAcceptingConnections = function() {
		return this._isAcceptingConnections;
	};
	ServerConnectionPool.prototype.onConnected = function(context, callback) {
		if(arguments.length === 1) {
			callback = context;
			context = this;
		}
		this._onConnectedCallbacks.push(function(conn) {
			callback.call(context, conn);
		});
	};
	ServerConnectionPool.prototype._fireConnectedEvent = function(rawConn) {
		var i, len;
		var conn = new ServerConnection(rawConn);
		if(this._isAcceptingConnections) {
			for(i = 0, len = this._onConnectedCallbacks.length; i < len; i++) {
				this._onConnectedCallbacks[i].call(this, conn);
			}
		}
		else {
			conn.disconnect('servernotacceptingconnections');
		}
	};

	return ServerConnectionPool;
});