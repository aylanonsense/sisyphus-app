if (typeof define !== 'function') { var define = require('amdefine')(module); }
define([ 'net/ServerConnection', 'util/EventState' ], function(ServerConnection, EventState) {
	function ServerConnectionPool(app) {
		var self = this;
		this._NEXT_CONNECTION_ID = 0;
		this._NEXT_STREAM_ID = 0;
		this._acceptingConnections = false;
		this._connections = [];
		this._openStreams = [];
		this._serverConnectionPoolState = new EventState();
		app.io.route('appjoinrequest', function(req) {
			var connId;
			var conn = new ServerConnection(req);
			if(self._acceptingConnections) {
				connId = self._NEXT_CONNECTION_ID++;
				conn.connect();
				conn.whenDisconnected(self, function() {
					var i, len;
					for(i = 0, len = this._connections.length; i < len; i++) {
						if(this._connections[i].id === connId) {
							this._connections.splice(i, 1);
							break;
						}
					}
				});
				conn.whenConnected(self, function() {
					var i, len, steam;
					var connObj = {
						id: connId,
						conn: conn,
						streams: {}
					};
					for(i = 0, len = this._openStreams.length; i < len; i++) {
						stream = this._openStreams[i];
						streams[stream.id] = conn.openStream(stream.messageType, stream.messageFunc); 
					}
					this._connections.push(connObj);
					self._serverConnectionPoolState.fireEvent('connected', conn);
				});
			}
			else {
				conn.disconnect();
			}
		});
	}
	ServerConnectionPool.prototype.startAcceptingConnections = function() {
		this._acceptingConnections = true;
	};
	ServerConnectionPool.prototype.stopAcceptingConnections = function() {
		this._acceptingConnections = false;
	};
	ServerConnectionPool.prototype.onConnected = function(context, callback) {
		this._serverConnectionPoolState.onEvent('connected', context, callback);
	};
	ServerConnectionPool.prototype.sendToAll = function(messageType, message, priority) {
		var i, len;
		for(i = 0, len = this._connections.length; i < len; i++) {
			this._connections[i].conn.send(messageType, message, priority);
		}
	};
	ServerConnectionPool.prototype.openStreamsToAll = function(messageType, messageFunc) {
		var i, len, stream;
		var self = this;
		var streamId = this._NEXT_STREAM_ID++;
		for(i = 0, len = this._connections.length; i < len; i++) {
			this._connections[i].streams[streamId] = this._connections[i].conn.openStream(messageType, messageFunc);
		}
		this._openStreams.push({
			id: streamId,
			messageType: messageType,
			messageFunc: messageFunc
		});
		return {
			forEachStream: function(context, func) {
				var i, len;
				if(arguments.length === 1) {
					func = context;
					context = this;
				}
				for(i = 0, len = self._connections.length; i < len; i++) {
					if(self._connections[i].streams[streamId]) {
						func.call(context, self._connections[i].streams[streamId]);
					}
				}
			},
			closeStreams: function() {
				var i, len;
				for(i = 0, len = self._openStreams.length; i < len; i++) {
					if(self._openStreams[i].id === streamId) {
						self._openStreams.splice(i, 1);
						break;
					}
				}
				for(i = 0, len = self._connections.length; i < len; i++) {
					if(self._connections[i].streams[streamId]) {
						self._connections[i].streams[streamId].closeStream();
						delete self._connections[i].streams[streamId];
					}
				}
			}
		};
	};
	ServerConnectionPool.prototype.getActiveConnections = function() {
		var i, len;
		var conns = [];
		for(i = 0, len = this._connections.length; i < len; i++) {
			conns.push(this._connections[i].conn);
		}
		return conns;
	};

	return ServerConnectionPool;
});