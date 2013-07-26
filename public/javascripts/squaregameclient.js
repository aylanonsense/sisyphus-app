var SquareGameClient = (function() {
	var debug = true;



	function SquareGameClientRunner(params) {
		this._game = new SquareGame();
		this._renderer = new SquareGameRenderer(this._game);
		this._renderer.renderIn(params.renderTarget);
		this._networkHandler = new SquareGameClientNetworkHandler();
		this._controller = new SquareGameClientController(this._game, this._networkHandler);
		this._networkHandler.setController(this._controller);
		this._inputListener = new KeyboardInputListener(this._controller, [this._renderer], new SquareGameControlMapping());
		this._timer = null;
	}
	SquareGameClientRunner.prototype.start = function() {
		var self, now, then;
		if(this._timer === null) {
			self = this;
			then = now = Date.now();
			this.timer = setInterval(function() {
				now = Date.now();
				self._update(now - then);
				then = now;
			}, 33);
		}
	};
	SquareGameClientRunner.prototype._update = function(ms) {
		this._game.update(ms);
		this._renderer.render();
	};
	SquareGameClientRunner.prototype.stop = function() {
		if(this._timer !== null) {
			clearInterval(this._timer);
			this._timer = null;
		}
	};



	function SquareGameClientController(game, networkHandler) {
		this._game = game;
		this._networkHandler = networkHandler;
		this._playerEntityId = null;
	}
	SquareGameClientController.prototype.receiveControl = function(control) {
		var command = null;
		switch(control.type) {
			case 'BEGIN_MOVE': command = this._receiveBeginMoveControl(control.dir); break;
			case 'END_MOVE': command = this._receiveEndMoveControl(control.dir); break;
			case 'CONFIRM': command = this._receiveConfirmControl(); break;
		}
		if(command !== null) {
			this.receiveCommand(command);
		}
	};
	SquareGameClientController.prototype._receiveBeginMoveControl = function(dir) {
		return { type: 'START_MOVING_PLAYER', dir: dir };
	};
	SquareGameClientController.prototype._receiveEndMoveControl = function(dir) {
		return { type: 'STOP_MOVING_PLAYER', dir: dir };
	};
	SquareGameClientController.prototype._receiveConfirmControl = function() {
		return { type: 'SPAWN_PLAYER' };
	};
	SquareGameClientController.prototype.receiveCommand = function(command) {
		var action = null;
		switch(command.type) {
			case 'START_MOVING_PLAYER': action = this._receiveStartMovingPlayerCommand(command.dir); break;
			case 'STOP_MOVING_PLAYER': action = this._receiveStopMovingPlayerCommand(command.dir); break;
			case 'SPAWN_PLAYER': action = this._receiveSpawnPlayerCommand(); break;
		}
		if(action !== null) {
			this._networkHandler.sendCommand(command);
			if(action.predictable !== false) {
				this._game.receiveAction(action);
			}
		}
	};
	SquareGameClientController.prototype._receiveStartMovingPlayerCommand = function(dir) {
		if(this._playerEntityId !== null) {
			return { type: 'START_MOVING_ENTITY', entityId: this._playerEntityId, dir: dir };
		}
		return null;
	};
	SquareGameClientController.prototype._receiveStopMovingPlayerCommand = function(dir) {
		if(this._playerEntityId !== null) {
			return { type: 'STOP_MOVING_ENTITY', entityId: this._playerEntityId, dir: dir };
		}
		return null;
	};
	SquareGameClientController.prototype._receiveSpawnPlayerCommand = function() {
		if(this._playerEntityId === null) {
			return { type: 'SPAWN_ENTITY', predictable: false };
		}
		return null;
	};
	SquareGameClientController.prototype.receiveAction = function(action) {
		this._game.receiveAction(action);
		if(action.type === 'SPAWN_ENTITY' && action.isOwner) {
			this._playerEntityId = action.entityId;
		}
	};
	SquareGameClientController.prototype.receiveState = function(state) {
		this._game.setState(state);
	};



	function SquareGameClientNetworkHandler() {
		var self = this;
		this._controller = null;
		this._pings = [];
		this._lastPing = { id: null, time: null };
		this._socket = io.connect();
		this._socket.on('ACTION', function(data) {
			self.receiveAction(data.action);
		});
		this._socket.on('STATE', function(data) {
			self.receiveState(data.state);
		});
		this._socket.on('PING_REQUEST', function(data) {
			self.receivePingRequest(data.id);
		});
		this._socket.on('PING_RESPONSE', function(data) {
			self.receivePingResponse(data.id, data.ping);
		});
		this._socket.emit('JOINING');
	}
	SquareGameClientNetworkHandler.prototype.getPing = function() {
		switch(this._pings.length) {
			case 1: return Math.floor(1.00 * this._pings[0]);
			case 2: return Math.floor(0.67 * this._pings[0] + 0.33 * this._pings[1]);
			case 3: return Math.floor(0.54 * this._pings[0] + 0.27 * this._pings[1] + 0.19 * this._pings[2]);
			case 4: return Math.floor(0.50 * this._pings[0] + 0.25 * this._pings[1] + 0.15 * this._pings[2] + 0.10 * this._pings[3]);
		}
		return 0;
	};
	SquareGameClientNetworkHandler.prototype.setController = function(controller) {
		this._controller = controller;
	};
	SquareGameClientNetworkHandler.prototype.sendCommand = function(command) {
		this._socket.emit('COMMAND', { command: command });
	};
	SquareGameClientNetworkHandler.prototype.receiveAction = function(action) {
		this._controller.receiveAction(action);
	};
	SquareGameClientNetworkHandler.prototype.receiveState = function(state) {
		this._controller.receiveState(state);
	};
	SquareGameClientNetworkHandler.prototype.receivePingRequest = function(id) {
		this._lastPing = { id: id, time: Date.now() };
		this._socket.emit('PING', { id: id, ping: this._ping });
	};
	SquareGameClientNetworkHandler.prototype.receivePingResponse = function(id, ping) {
		if(this._lastPing.id === id) {
			this._updatePing(Date.now() - this._lastPing.time);
			this._lastPing = { id: null, time: null };
			if(debug) console.log("Ping: " + Math.round(this.getPing()) + "ms (", this._pings, ")");
		}
	};
	SquareGameClientNetworkHandler.prototype._updatePing = function(ping) {
		this._pings.push(ping);
		if(this._pings.length > 4) {
			this._pings.shift();
		}
	};



	function SquareGameRenderer(game) {
		var self = this;
		this._game = game;
		this._inputListeners = [];
		this._root = $('<div tabindex="1" style="width:400px;height:400px;border:3px solid black;position:relative;"></div>');
		this._root.on('keydown', function(evt) {
			self._fireInputEvent({ device: 'keyboard', type: 'press', key: evt.which });
		});
		this._root.on('keyup', function(evt) {
			self._fireInputEvent({ device: 'keyboard', type: 'release', key: evt.which });
		});
	}
	SquareGameRenderer.prototype.renderIn = function(ele) {
		ele.append(this._root);
	};
	SquareGameRenderer.prototype.render = function() {
		var self = this;
		var state = this._game.getState();
		this._clearRenderArea();
		state.entities.forEach(function(entity) {
			self._drawSquare(entity.color, entity.x, entity.y);
		});
		state.shadows.forEach(function(shadow) {
			self._drawShadow(shadow.color, shadow.x, shadow.y);
		});
	};
	SquareGameRenderer.prototype._clearRenderArea = function() {
		this._root.empty();
	};
	SquareGameRenderer.prototype._drawSquare = function(color, x, y) {
		$('<div style="position:absolute;width:25px;height:25px;"></div>')
			.css('left', x + 'px').css('top', y + 'px').css('background-color', (color || 'black'))
			.appendTo(this._root);
	};
	SquareGameRenderer.prototype._drawShadow = function(color, x, y) {
		$('<div style="position:absolute;width:25px;height:25px;border:2px solid ' + (color || 'black') + ';"></div>')
			.css('left', (x - 2) + 'px').css('top', (y - 2) + 'px')
			.appendTo(this._root);
	};
	SquareGameRenderer.prototype.addInputListener = function(inputListener) {
		this._inputListeners.push(inputListener);
	};
	SquareGameRenderer.prototype._fireInputEvent = function(input) {
		this._inputListeners.forEach(function(inputListener) {
			inputListener.receiveInput(input);
		});
	};
	SquareGameRenderer.prototype.getRoot = function() {
		return this._root;
	};



	function KeyboardInputListener(controller, inputSources, controlMapping) {
		var self = this;
		this._controller = controller;
		inputSources.forEach(function(inputSource) {
			inputSource.addInputListener(self);
		});
		this._controlMapping = controlMapping;
	}
	KeyboardInputListener.prototype.receiveInput = function(input) {
		var control = this._controlMapping.receiveInput(input);
		if(control !== null) {
			this._controller.receiveControl(control);
		}
	};



	function SquareGameControlMapping() {}
	SquareGameControlMapping.prototype.receiveInput = function(input) {
		if(input.device === 'keyboard') {
			if(input.type === 'press') {
				switch(input.key) {
					case 87: return { type: 'BEGIN_MOVE', dir: 'UP' };
					case 65: return { type: 'BEGIN_MOVE', dir: 'LEFT' };
					case 83: return { type: 'BEGIN_MOVE', dir: 'DOWN' };
					case 68: return { type: 'BEGIN_MOVE', dir: 'RIGHT' };
					case 13: return { type: 'CONFIRM' };
				}
			}
			else if(input.type === 'release') {
				switch(input.key) {
					case 87: return { type: 'END_MOVE', dir: 'UP' };
					case 65: return { type: 'END_MOVE', dir: 'LEFT' };
					case 83: return { type: 'END_MOVE', dir: 'DOWN' };
					case 68: return { type: 'END_MOVE', dir: 'RIGHT' };
				}
			}
		}
		return null;
	};

	return SquareGameClientRunner;
})();

$(document).ready(function() {
	(new SquareGameClient({
		renderTarget: $('#square-game-area')
	})).start();
});