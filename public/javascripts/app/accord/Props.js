if (typeof define !== 'function') { var define = require('amdefine')(module); }
define(function() {
	function Props(defs) {
		this._propMap = {};
		this._parseDefinitions(defs);
	}
	Props.prototype._parseDefinitions = function(defs) {
		var key;
		defs = (defs || {});
		for(key in defs) {
			if(defs.hasOwnProperty(key)) {
				this._propMap[key] = defs.initially;
			}
		}
	};
	Props.prototype.get = function(key) {
		return this._propMap[key];
	};
	Props.prototype.set = function(key, val) {
		this._propMap[key] = val;
	};

	return Props;
});