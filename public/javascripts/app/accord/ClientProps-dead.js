if (typeof define !== 'function') { var define = require('amdefine')(module); }
define(function() {
	function ClientProps(defs) {
		this._propMap = {};
		this._parseDefinitions(defs);
	}
	ClientProps.prototype._parseDefinitions = function(defs) {
		var key;
		defs = (defs || {});
		for(key in defs) {
			if(defs.hasOwnProperty(key)) {
				this._addProperty(key, defs[key]);
			}
		}
	};
	ClientProps.prototype._addProperty = function(key, defs) {
		this._propMap[key] = {
			actual: defs.initially,
			prediction: defs.initially,
			def: defs
		};
	};
	ClientProps.prototype.get = function(key) {
		var prop = this._propMap[key];
		if(prop) {
			if(prop.def.predictChanges === true) {
				return prop.def.prediction;
			}
			return prop.def.actual;
		}
		return undefined;
	};
	ClientProps.prototype.set = function(key, val) {
		var oldVal;
		var prop = this._propMap[key];
		if(prop) {
			oldVal = prop.prediction;
			prop.prediction = val;
			this._firePredictionChangedEvent(key, oldVal, val);
		}
	};
	ClientProps.prototype._firePredictionChangedEvent = function(key, oldVal, newVal) {
		if(oldVal !== newVal) {
			//TODO notify 
		}
	};
	ClientProps.prototype.updateActuals = function(props) {
		//TODO
	};
	ClientProps.prototype._fireActualChangedEvent = function(key, oldVal, newVal) {
		if(oldVal !== newVal) {
			//TODO notify client of changes to actuals, possible conflict resolution
		}
	};

	/*
		new ClientProps({
			posX: {
				initially: 0,
				sendChanges: false,
				predictChanges: true,
				sendPeriodicUpdates: true,
				timeBetweenPeriodicUpdates: 400,
				importanceOfPeriodicUpdates: PRIORITY.NORMAL
			},
			velX: {
				initially: 0,
				sendChanges: true,
				predictChanges: true,
				sendPeriodicUpdates: true,
				timeBetweenPeriodicUpdates: 2000,
				importanceOfChanges: PRIORITY.HIGH,
				importanceOfPeriodicUpdates: PRIORITY.LOW
			},
			color: {
				initially: 'blue',
				shared: false
			}
		})
	*/

	return ClientProps;
});