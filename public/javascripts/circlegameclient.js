var CircleGameClient = (function() {



	function GameRunner(params) {
		this._game = new CircleGame({ maxRewind: params.maxRewind });
		this._controller = new GameController(this);
		this._inputListener = new KeyboardInputListener(this._controller);
		this._renderer = new GameRenderer(this._game);
		this._renderer.renderIn(params.renderTarget);
		this._renderer.addInputListener(this._inputListener);
		this._networkHandler = new ClientNetworkHandler();
		this._timer = null;
	}
	GameRunner.prototype.start = function() {
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
	GameRunner.prototype._update = function(ms) {
		this._game.update(ms);
		this._renderer.render();
	};
	GameRunner.prototype.stop = function() {
		if(this._timer !== null) {
			clearInterval(this._timer);
			this._timer = null;
		}
	};
	GameRunner.prototype.getController = function() {
		return this._controller;
	};
	GameRunner.prototype.receiveAction = function(action) {
		this._game.receiveAction(action);
	};
	GameRunner.prototype.sendCommand = function(command) {
		this._networkHandler.send('COMMAND', command);
	};



	function GameController(runner) {
		this._runner = runner;
	}
	GameController.prototype.receiveControl = function(control) {
		if(control.type === 'BEGIN_MOVE') {
			this.startMoving(control.dir);
		}
		else if(control.type === 'END_MOVE') {
			this.stopMoving(control.dir);
		}
		else if(control.type === 'CONFIRM') {
			//TODO request for spawn
			this.spawn({
				id: 0,
				x: 200,
				y: 200,
				color: 'orange',
				dir: null
			});
		}
	};
	GameController.prototype.startMoving = function(dir) {
		var action = { type: 'CHANGE_ENTITY_DIR', entityId: 0, dir: dir };
		if(dir === 'N' || dir === 'S') {
			action.axis = 'VERTICAL';
		}
		else if(dir === 'E' || dir === 'W') {
			action.axis = 'HORIZONTAL';
		}
		this._runner.receiveAction(action);
	};
	GameController.prototype.stopMoving = function(dir) {
		var action = { type: 'CHANGE_ENTITY_DIR', entityId: 0, dir: null };
		if(dir === 'N' || dir === 'S') {
			action.axis = 'VERTICAL';
		}
		else if(dir === 'E' || dir === 'W') {
			action.axis = 'HORIZONTAL';
		}
		this._runner.receiveAction(action);
	};
	GameController.prototype.spawn = function(state) {
		this._runner.receiveAction({ type: 'SPAWN_ENTITY', state: state });
	};



	function GameRenderer(game) {
		var self = this;
		this._game = game;
		this._inputListeners = [];
		this._root = $('<div tabindex="1" style="width:400px;height:400px;border:3px solid black;position:relative;"></div>');
		this._keysDown = {};
		this._root.on('keydown', function(evt) {
			if(!self._keysDown[evt.which]) {
				self._fireInputEvent({ device: 'KEYBOARD', event: 'PRESS', key: evt.which });
			}
			self._keysDown[evt.which] = true;
		});
		this._root.on('keyup', function(evt) {
			self._fireInputEvent({ device: 'KEYBOARD', event: 'RELEASE', key: evt.which });
			self._keysDown[evt.which] = false;
		});
	}
	GameRenderer.prototype.renderIn = function(ele) {
		ele.append(this._root);
	};
	GameRenderer.prototype.render = function() {
		var self = this;
		var state = this._game.getState();
		this._root.empty();
		state.entities.forEach(function(entity) {
			$('<div style="position:absolute;width:25px;height:25px;"></div>')
				.css('left', entity.x + 'px')
				.css('top', entity.y + 'px')
				.css('background-color', entity.color)
				.appendTo(self._root);
		});
	};
	GameRenderer.prototype.addInputListener = function(inputListener) {
		this._inputListeners.push(inputListener);
	};
	GameRenderer.prototype._fireInputEvent = function(input) {
		this._inputListeners.forEach(function(inputListener) {
			inputListener.receiveInput(input);
		});
	};



	function KeyboardInputListener(controlReceiver) {
		this._controlReceiver = controlReceiver;
	}
	KeyboardInputListener.prototype.receiveInput = function(input) {
		var control = this._toControl(input);
		if(control !== null) {
			this._controlReceiver.receiveControl(control);
		}
	};
	KeyboardInputListener.prototype._toControl = function(input) {
		if(input.device === 'KEYBOARD') {
			if(input.event === 'PRESS') {
				switch(input.key) {
					case 87: return { type: 'BEGIN_MOVE', dir: 'N' };
					case 83: return { type: 'BEGIN_MOVE', dir: 'S' };
					case 68: return { type: 'BEGIN_MOVE', dir: 'E' };
					case 65: return { type: 'BEGIN_MOVE', dir: 'W' };
					case 13: return { type: 'CONFIRM' };
				}
			}
			else if(input.event === 'RELEASE') {
				switch(input.key) {
					case 87: return { type: 'END_MOVE', dir: 'N' };
					case 83: return { type: 'END_MOVE', dir: 'S' };
					case 68: return { type: 'END_MOVE', dir: 'E' };
					case 65: return { type: 'END_MOVE', dir: 'W' };
				}
			}
		}
		return null;
	};



	function ClientNetworkHandler() {
		var self = this;
		this._conn = new GameLib.Connection({
			socket: new Socket(),
			maxMessagesSentPerSecond: 10
		});
		this._receiveCallbacks = [];
		this._conn.onReceive(function(message) {
			self._receiveCallbacks.forEach(function(callback) {
				callback(message);
			});
		});
		var i = 0;
		setInterval(function() {
			self.send("i = " + i++);
		}, 10);
	}
	ClientNetworkHandler.prototype.send = function(message) {
		this._conn.send(message);
	};
	ClientNetworkHandler.prototype.onReceive = function(callback) {
		this._receiveCallbacks.push(callback);
	};



	function Socket() {
		this._socket = io.connect();
		this._socket.emit('JOIN_GAME');
	}
	Socket.prototype.emit = function(messageType, message) {
		this._socket.emit(messageType, message);
	};
	Socket.prototype.on = function(messageType, callback) {
		this._socket.on(messageType, callback);
	};



	return GameRunner;
})();

$(document).ready(function() {
	var game = new CircleGameClient({
		renderTarget: $('#circle-game-area'),
		maxRewind: 500
	});
	game.start();
	game.getController().spawn({
		id: 0,
		x: 100,
		y: 100,
		color: 'blue',
		dir: null
	});
	$('<input type="button" value="Start Moving Left" />')
		.on('click', function() {
			game.getController().startMoving('W');
		})
		.appendTo('body');
	var c = game.getController();
	var i = 0;
	setInterval(function() {
		i++;
		if(i%4 === 0) {
			c.startMoving('NW');
		}
		if(i%4 === 1) {
			c.startMoving('NE');
		}
		if(i%4 === 2) {
			c.startMoving('SE');
		}
		if(i%4 === 3) {
			c.startMoving('SW');
		}
	}, 400);
});