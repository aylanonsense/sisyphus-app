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
		if(debug) console.log("command:", command);
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
		if(debug) console.log("action:", action);
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
		if(debug) console.log("action:", action);
		if(action.type === 'SPAWN_ENTITY' && action.isOwner) {
			this._playerEntityId = action.entityId;
		}
	};
	SquareGameClientController.prototype.receiveState = function(state) {
		if(debug) console.log("state:", state);
		this._game.setState(state);
	};



	function SquareGameClientNetworkHandler() {
		var self = this;
		this._controller = null;
		this._socket = io.connect();
		this._socket.on('action', function(data) {
			self.receiveAction(data.action);
		});
		this._socket.on('state', function(data) {
			self.receiveState(data.state);
		});
		if(debug) console.log("--> joining");
		this._socket.emit('joining');
	}
	SquareGameClientNetworkHandler.prototype.setController = function(controller) {
		this._controller = controller;
	};
	SquareGameClientNetworkHandler.prototype.sendCommand = function(command) {
		if(debug) console.log("--> command:", command);
		this._socket.emit('command', { command: command });
	};
	SquareGameClientNetworkHandler.prototype.receiveAction = function(action) {
		if(debug) console.log("<-- action:", action);
		this._controller.receiveAction(action);
	};
	SquareGameClientNetworkHandler.prototype.receiveState = function(state) {
		if(debug) console.log("<-- state:", state);
		this._controller.receiveState(state);
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
		this._clearRenderArea();
		this._game.getState().entities.forEach(function(entity) {
			self._drawSquare(entity.color, entity.x, entity.y);
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
		if(debug) console.log("control:", control);
		if(control !== null) {
			this._controller.receiveControl(control);
		}
	};



	function SquareGameControlMapping() {}
	SquareGameControlMapping.prototype.receiveInput = function(input) {
		if(input.device === 'keyboard') {
			if(input.type === 'press') {
				switch(input.key) {
					case 87: return { type: 'BEGIN_MOVE', dir: 'up' };
					case 65: return { type: 'BEGIN_MOVE', dir: 'left' };
					case 83: return { type: 'BEGIN_MOVE', dir: 'down' };
					case 68: return { type: 'BEGIN_MOVE', dir: 'right' };
					case 13: return { type: 'CONFIRM' };
				}
			}
			else if(input.type === 'release') {
				switch(input.key) {
					case 87: return { type: 'END_MOVE', dir: 'up' };
					case 65: return { type: 'END_MOVE', dir: 'left' };
					case 83: return { type: 'END_MOVE', dir: 'down' };
					case 68: return { type: 'END_MOVE', dir: 'right' };
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