if (typeof define !== 'function') { var define = require('amdefine')(module); }
define([ 'net/PriorityEnum' ], function(PRIORITY) {
	var NEXT_ID = 0;
	function ServerProps(id, conn, defs) {
		var key, def, prop;
		if(arguments.length === 2) {
			defs = conn;
			conn = id;
			id = 'server' + NEXT_ID++;
		}
		this._id = id;
		this._conn = conn;
		this._propKeys = [];
		this._propMap = {};
		defs = (defs || {});
		for(key in defs) {
			if(defs.hasOwnProperty(key)) {
				def = defs[key];
				prop = {};
				prop.actual = def.initially;
				prop.shared = (def.shared === true);
				prop.sendChanges = (prop.shared && def.sendChanges === true);
				prop.priorityOfChanges = (def.priorityOfChanges || def.priority || PRIORITY.NORMAL);
				prop.sendPeriodicUpdates = (prop.shared && def.sendPeriodicUpdates === true);
				prop.timeBetweenPeriodicUpdates = (def.timeBetweenPeriodicUpdates || 2000);
				prop.priorityOfPeriodicUpdates = (def.priorityOfPeriodicUpdates || def.priority || PRIORITY.NORMAL);
				this._propKeys.push(key);
				this._propMap[key] = prop;
			}
		}
		this._streams = this._conn.openStreamsToAll(this, function() {
			var i, len;
			var values = {};
			for(i = 0, len = this._propKeys.length; i < len; i++) {
				values[this._propKeys[i]] = this._propMap[this._propKeys[i]].actual;
			}
			return {
				propId: this._id,
				values: values
			};
		});
	}
	ServerProps.prototype.get = function(key) {
		return this._propMap[key].actual;
	};
	ServerProps.prototype.set = function(key, val, action) {
		var prop = this._propMap[key];
		if(prop) {
			prop.actual = val;
			if(prop.sendChanges) {
				this._streams.forEachStream(this, function(stream) {
					var priority = stream.getPriority();
					if(priority === null || priority < prop.priorityOfChanges) {
						stream.setPriority(prop.priorityOfChanges);
					}
				});
			}
		}
	};
	ServerProps.prototype.checkForPeriodicUpdates = function() {
		var i, len, prop;
		for(i = 0, len = this._propKeys.length; i < len; i++) {
			prop = this._propMap[this._propKeys[i]];
			if(prop.sendPeriodicUpdates) {
				this._sendPeriodicUpdatesIfNecessary(prop);
			}
		}
	};
	ServerProps.prototype._sendPeriodicUpdatesIfNecessary = function(prop) {
		var now = Date.now();
		this._streams.forEachStream(this, function(stream) {
			var priority = stream.getPriority();
			var timeLastSent = stream.timeLastSent();
			if(timeLastSent === null || now - timeLastSent > prop.timeBetweenPeriodicUpdates) {
				if(priority === null || priority < prop.priorityOfPeriodicUpdates) {
					stream.setPriority(prop.priorityOfPeriodicUpdates);
				}
			}
		});
	};

	return ServerProps;
});