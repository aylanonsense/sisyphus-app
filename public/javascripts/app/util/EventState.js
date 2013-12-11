if (typeof define !== 'function') { var define = require('amdefine')(module); }
define([ 'util/EventUtils' ], function(EventUtils) {
	function EventState(flags) {
		this.initializeEvents();
		this.initializeFlags(flags);
	}
	EventUtils.firesEvents(EventState.prototype);
	EventUtils.hasFlags(EventState.prototype);

	return EventState;
});