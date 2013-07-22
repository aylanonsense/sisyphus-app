var SquareGameRunner = (function() {
	function SquareGameRunner(params) {
		this.game = new SquareGame();
		this.renderer = new SquareGameRenderer(this.game);
		if(params && params.renderTarget) {
			this.renderer.renderIn(params.renderTarget);
		}
		this.inputListener = new KeyboardInputListener(this.game, [ this.renderer ], new SquareGameKeyMapping());
		if(params.multiplayer === true) {
			this.networkHandler = new ClientNetworkHandler(this.game);
		}
		else {
			this.networkHandler = new SingleplayerNetworkHandler(this.game);
		}
		this.game.setNetworkHandler(this.networkHandler);
		this.timer = null;
	}
	SquareGameRunner.prototype.start = function() {
		var self, now, then;
		if(this.timer === null) {
			self = this;
			then = now = Date.now();
			this.update(0);
			this.timer = setInterval(function() {
				now = Date.now();
				self.update(now - then);
				then = now;
			}, 33);
		}
	};
	SquareGameRunner.prototype.stop = function() {
		if(this.timer !== null) {
			clearInterval(this.timer);
			this.timer = null;
		}
	};
	SquareGameRunner.prototype.update = function(ms) {
		this.game.update(ms);
		this.renderer.render();
	};



	function ClientNetworkHandler(game) {
		var self = this;
		this._connectionId = null;
		this._game = game;
		this._socket = io.connect();
		this._socket.on('connect-accepted', function(data) {
			self._connectionId = data.id;
		});
		this._socket.on('action', function(data) {
			self._game.receiveAction(data.action, data.results);
		});
		this._socket.on('state', function(data) {
			self._game.updateState(data.state);
		});
		this._socket.emit('connect-requested');
	}
	ClientNetworkHandler.prototype.sendAction = function(action, results) {
		this._socket.emit('action', {
			action: action,
			results: results
		});
	};



	function SingleplayerNetworkHandler(game) {
		this._game = game;
	}
	SingleplayerNetworkHandler.prototype.sendAction = function(action, results) {
		if(action.type === 'spawn') {
			this._game.receiveAction({
				type: 'spawn',
				squareId: 0,
				square: {
					id: 0,
					x: 200,
					y: 200,
					color: 'orange'
				},
				isOwner: true
			});
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
	}
	SquareGameRenderer.prototype.render = function() {
		var self = this;
		var state = this._game.getRenderableState();
		this._clearRenderArea();
		state.squares.forEach(function(square) {
			self._drawSquare(square.color, square.x, square.y);
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
			inputListener.onInput(input);
		});
	};
	SquareGameRenderer.prototype.getRoot = function() {
		return this._root;
	};



	function KeyboardInputListener(game, inputSources, commandMapping) {
		var self = this;
		this.game = game;
		this.inputSources = inputSources;
		this.inputSources.forEach(function(inputSource) {
			inputSource.addInputListener(self);
		});
		this.commandMapping = commandMapping;
	}
	KeyboardInputListener.prototype.onInput = function(input) {
		var command = this.commandMapping.toCommand(input);
		if(command !== null) {
			this.game.receiveCommand(command);
		}
	};



	function SquareGameKeyMapping() {}
	SquareGameKeyMapping.prototype.toCommand = function(input) {
		if(input.device === 'keyboard') {
			if(input.type === 'press') {
				switch(input.key) {
					case 87: return { type: 'startMoving', dir: 'up' };
					case 65: return { type: 'startMoving', dir: 'left' };
					case 83: return { type: 'startMoving', dir: 'down' };
					case 68: return { type: 'startMoving', dir: 'right' };
					case 13: return { type: 'confirm' };
				}
			}
			else if(input.type === 'release') {
				switch(input.key) {
					case 87: return { type: 'stopMoving', dir: 'up' };
					case 65: return { type: 'stopMoving', dir: 'left' };
					case 83: return { type: 'stopMoving', dir: 'down' };
					case 68: return { type: 'stopMoving', dir: 'right' };
				}
			}
		}
		return null;
	};



	return SquareGameRunner;
})();

$(document).ready(function() {
	(new SquareGameRunner({
		multiplayer: true,
		renderTarget: $('#square-game-area')
	})).start();
});