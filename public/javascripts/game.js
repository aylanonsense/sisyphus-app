var bridgsSquareGameLibrary = (function() {
	function SquareGameRunner(params) {
		this.game = new SquareGame();
		this.renderer = new SquareGameRenderer(this.game);
		if(params && params.renderTarget) {
			params.renderTarget.append(this.renderer.getRoot());
		}
		this.inputListener = new KeyboardInputListener(this.game, [ this.renderer ], new SquareGameKeyMapping());
		this.networkHandler = new params.networkHandler(this.game);
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
		this._game = game;
		this._socket = io.connect();
		this._socket.on('joined', function(data) {
			self.connected(data.id);
		});
		this._socket.on('action', function(data) {
			self.receiveAction(data.action, data.results);
		});
		this._socket.emit('joining-game');
	}
	ClientNetworkHandler.prototype.connected = function(id) {
		this._game.joinedAs(id);
	};
	ClientNetworkHandler.prototype.sendAction = function(action, results) {
		this._socket.emit('action', { action: action, results: results });
	};
	ClientNetworkHandler.prototype.receiveAction = function(action, results) {
		this._game.receiveAction(action, results);
	};



	function SingleplayerNetworkHandler(game) {
		this._game = game;
	}
	SingleplayerNetworkHandler.prototype.sendAction = function(action, results) {
		if(action.type === 'spawn') {
			this._game.receiveAction({
				type: 'spawn',
				square: {
					id: 0,
					x: 200,
					y: 200,
					color: 'red'
				}
			});
		}
	};



	function SquareGame() {
		this._myPlayerId = null;
		this._playerIds = [];
		this._hasSpawned = false;
		this._mySquareId = -1;
		this._mySquareIsMovingUp = false;
		this._mySquareIsMovingDown = false;
		this._mySquareIsMovingLeft = false;
		this._mySquareIsMovingRight = false;
		this._squares = [];
		this._networkHandler = null;
	}
	SquareGame.prototype.joinedAs = function(id) {
		this._myPlayerId = id;
		this.playerJoined(id);
	};
	SquareGame.prototype.playerJoined = function(id) {
		this._playerIds.push(id);
	};
	SquareGame.prototype.update = function(ms) {
		this._squares.forEach(function(player) {
			player.update(ms);
		});
	};
	SquareGame.prototype.receiveCommand = function(command) {
		var action = null;
		var results = null;
		if(command.type === 'move') {
			if(this._mySquareId > -1) {
				if(command.starting) {
					action = { type: 'move', dir: command.dir };
					switch(command.dir) {
						case 'up':
							this._mySquareIsMovingUp = true;
							break;
						case 'down':
							this._mySquareIsMovingDown = true;
							break;
						case 'left':
							this._mySquareIsMovingLeft = true;
							break;
						case 'right':
							this._mySquareIsMovingRight = true;
							break;
					}
				}
				else {
					switch(command.dir) {
						case 'up':
							this._mySquareIsMovingUp = false;
							action = (this._mySquareIsMovingDown ? { type: 'move', dir: 'down' } : { type: 'stop', dir: 'vertically' });
							break;
						case 'down':
							this._mySquareIsMovingDown = false;
							action = (this._mySquareIsMovingUp ? { type: 'move', dir: 'up' } : { type: 'stop', dir: 'vertically' });
							break;
						case 'left':
							this._mySquareIsMovingLeft = false;
							action = (this._mySquareIsMovingRight ? { type: 'move', dir: 'right' } : { type: 'stop', dir: 'horizontally' });
							break;
						case 'right':
							this._mySquareIsMovingRight = false;
							action = (this._mySquareIsMovingLeft ? { type: 'move', dir: 'left' } : { type: 'stop', dir: 'horizontally' });
							break;
					}
				}
			}
		}
		else if(command.type === 'confirm') {
			if(!this._hasSpawned) {
				this._networkHandler.sendAction({ type: 'spawn' });
			}
		}
		if(action !== null) {
			action.squareId = this._mySquareId;
			results = this.receiveAction(action);
			if(this._networkHandler !== null) {
				this._networkHandler.sendAction(action, results);
			}
		}
	};
	SquareGame.prototype.receiveAction = function(action) {
		var results = null;
		var square = null;
		if(action.type === 'move') {
			square = this._getSquare(action.squareId);
			square.startMoving(action.dir);
			results = square.getState('movement');
		}
		else if(action.type === 'stop') {
			square = this._getSquare(action.squareId);
			square.stopMoving(action.dir);
			results = square.getState('movement');
		}
		else if(action.type === 'spawn') {
			square = this._createSquare(action.square.id);
			square.setState(action.square);
			this._mySquareId = action.square.id;
			this._hasSpawned = true;
		}
		return results;
	};
	SquareGame.prototype._getSquare = function(id) {
		for(var i = 0; i < this._squares.length; i++) {
			if(this._squares[i].getId() === id) {
				return this._squares[i];
			}
		}
		return null;
	};
	SquareGame.prototype._createSquare = function(id, x, y, color) {
		var square = new SquareEntity(id, x, y, color);
		this._squares.push(square);
		return square;
	};
	SquareGame.prototype.setNetworkHandler = function(networkHandler) {
		this._networkHandler = networkHandler;
	};
	SquareGame.prototype.getRenderableState = function() {
		var squares = this._squares.map(function(square) {
			return square.getState('render');
		});
		return {
			squares: squares
		};
	};



	function SquareEntity(id, x, y, color) {
		this._id = id;
		this._x = (x || 0);
		this._y = (y || 0);
		this._color = (color || 'black');
		this._horizontalMove = 0;
		this._verticalMove = 0;
	}
	SquareEntity.MOVE_SPEED = 150;
	SquareEntity.DIAGONAL_MOVE_SPEED = SquareEntity.MOVE_SPEED / Math.sqrt(2);
	SquareEntity.prototype.getId = function() {
		return this._id;
	};
	SquareEntity.prototype.startMoving = function(dir) {
		switch(dir) {
			case 'up': this._verticalMove = -1; break;
			case 'down': this._verticalMove = 1; break;
			case 'left': this._horizontalMove = -1; break;
			case 'right': this._horizontalMove = 1; break;
		}
	};
	SquareEntity.prototype.stopMoving = function(dir) {
		switch(dir) {
			case 'vertically': this._verticalMove = 0; break;
			case 'horizontally': this._horizontalMove = 0; break;
		}
	};
	SquareEntity.prototype.update = function(ms) {
		var moveSpeed = SquareEntity.MOVE_SPEED;
		if(this._horizontalMove !== 0 && this._verticalMove !== 0) {
			moveSpeed = SquareEntity.DIAGONAL_MOVE_SPEED;
		}
		this._x += this._horizontalMove * moveSpeed * ms / 1000;
		this._y += this._verticalMove * moveSpeed * ms / 1000;
	};
	SquareEntity.prototype.getState = function(parts) {
		switch(parts) {
			case 'render':
				return {
					x: this._x,
					y: this._y,
					color: this._color
				};
			case 'movement':
				return {
					hori: this._horizontalMove,
					vert: this._verticalMove
				};
			case 'all':
				return {
					id: this._id,
					x: this._x,
					y: this._y,
					color: this._color,
					hori: this._horizontalMove,
					vert: this._verticalMove
				};
		}
	};
	SquareEntity.prototype.setState = function(state) {
		if(state.x) this._x = state.x;
		if(state.y) this._y = state.y;
		if(state.color) this._color = state.color;
		if(state.hori) this._horizontalMove = state.hori;
		if(state.vert) this._verticalMove = state.vert;
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
					case 87: return { type: 'move',  starting: true, dir: 'up' };
					case 65: return { type: 'move',  starting: true, dir: 'left' };
					case 83: return { type: 'move',  starting: true, dir: 'down' };
					case 68: return { type: 'move',  starting: true, dir: 'right' };
					case 13: return { type: 'confirm' };
				}
			}
			else if(input.type === 'release') {
				switch(input.key) {
					case 87: return { type: 'move',  starting: false, dir: 'up' };
					case 65: return { type: 'move',  starting: false, dir: 'left' };
					case 83: return { type: 'move',  starting: false, dir: 'down' };
					case 68: return { type: 'move',  starting: false, dir: 'right' };
				}
			}
		}
		return null;
	};



	return {
		SquareGameRunner: SquareGameRunner,
		SquareGame: SquareGame,
		SingleplayerNetworkHandler: SingleplayerNetworkHandler,
		ClientNetworkHandler: ClientNetworkHandler
	};
})();

if(typeof module !== "undefined" && typeof module.exports !== "undefined") {
	module.exports = bridgsSquareGameLibrary;
}
else {
	$(document).ready(function() {
		var g = new bridgsSquareGameLibrary.SquareGameRunner({
			networkHandler: bridgsSquareGameLibrary.ClientNetworkHandler,
			renderTarget: $('#square-game-area')
		});
		g.start();
	});
}

/*if(module && module.exports) {
	module.exports = bridgsSquareGameLibrary;
}*/
/*
GameRunner
  constructor():
    game = new Game()
    renderer = new GameRenderer(game)
    inputListener = new InputListener(game, [ renderer ])
    network = new NetworkHandler(game)
  start():
    timer = every 20ms:
      game.update(20)
  stop():
    timer.stop()
  update(ms):
    game.update(ms)
    renderer.render()

Game
  constructor():
  update(ms):
    ...
  receiveCommand(command):
    ...
    results = receiveAction(action)
    if networked:
      if authoritative:
        network.sendState(results)
      else:
        network.sendAction(action, results)
  receiveAction(action):
    ...
    return results
  updateState(state):
    ...
  setNetworkHandler(network):
    this.network = network

GameRenderer
  constructor(game)
    this.game = game
  render()
    ...

NetworkHandler
  constructor(game):
    this.game = game
    game.setNetworkHandler(this)
  onReceiveState(conn, state): //client only
    game.updateState(state)
  onReceiveAction(conn, action, prediction): //server only
    actuals = game.receiveAction(action)
    if(actuals !=== prediction)
      sendState(all, actuals)
    else
      sendState(all except conn, actuals)
  sendState(conn, state): //server only
    ...
  sendAction(action, prediction): //client only
    ...

InputFirer
  constructor()
  addInputListener(func):
    listeners.push(func)
  fireInputEvent(evt):
    listeners.each.onInput(this, evt)

InputListener
  constructor(game, inputFirers)
    this.game = game
    inputFirers.each.addInputListener(this)
  onInput(inputFirer, evt):
    ...
    game.receiveCommand(command)


GameRunner
  - contructor(game, renderer)
  - start()
  - stop()
  - update(ms) {
	  game.update(ms)
	  renderer.render(game)
    }

Game
  - constructor()
  - setState(state)
  - update(ms)
  - receiveCommand(command, details)

GameRenderer
  - constructor(game)
  - render()

GameNetworkHandler
  - constructor(game)

GameInputListener
  - constructor(game, commandMapping)
  - setMode(mode)
  - startListening()
  - stopListening()

GameCommandMapping
  - lookupCommand(input)

ConstantGameRunner
AnimtionOptimizedGameRunner
SpaceCrisisGame
SpaceCrisisDefaultGameRenderer
SpiceCrisisServerNetworkHandler
SpaceCrisisClientNetworkHandler
KeyboardInputListener
KeyboardCommandMapping
SpaceCrisisDefaultKeyboardCommandMapping
*/

/*var bridgsGameLibrary = (function() {
	var Game;
	var GameRenderer;
	var InputListener;
	var GameRunner;
	var GameState;
	var CommandMapping;

	GameRunner = function() {

	};
	GameRunner.prototype.runGame = function(game, renderer, params) {
		//TODO
	};

	GameRenderer = function(game) {
		this._game = game;
	};
	GameRenderer.prototype.render = function() {
		//TODO
	};

	GameState = function() {

	};
	GameState.prototype.update = function(ms) {
		//TODO
	};

	return {
		Game: Game,
		GameRenderer: GameRenderer,
		InputListener: InputListener,
		GameRunner: GameRunner,
		GameState: GameState,
		CommandMapping: CommandMapping
	}
})();


//expose server-side game elements to Node.js
if(exports) {
	exports.Game = bridgsGameLibrary.Game;
	exports.GameRunner = bridgsGameLibrary.GameRunner;
}*/



/*
$(document).ready(function() {
	var Game = function($root) {
		this.square = $('<div style="width:100px;height:100px;background-color:red;position:absolute;"></div>');
		this.square.appendTo($root);
		this.posX = 0;
		this.isMovingRight = true;
		this.moveSpeed = 50;
		this.maxX = 400;
	};
	Game.prototype.update = function(ms) {
		if(ms > 0) {
			this.posX += (this.isMovingRight ? 1 : -1) * this.moveSpeed * ms / 1000;
			if(this.isMovingRight && this.posX > this.maxX) {
				this.posX = 2 * this.maxX - this.posX;
				this.isMovingRight = false;
			}
			else if(!this.isMovingRight && this.posX < 0) {
				this.posX = -1 * this.posX;
				this.isMovingRight = true;
			}
		}
	};
	Game.prototype.render = function() {
		this.square.css('left', Math.round(this.posX) + 'px');
	};
	var d = -1;

	var g = new Game($('#game-area'));
	var prevTime = -1;
	(function loop(time) {
		window.requestAnimationFrame(loop);
		var delta = (prevTime === -1 ? 0 : time - prevTime);
		prevTime = time;
		g.update(delta);
		g.render();
	})(-1);

	var g2 = new Game($('#game-area'));
	g2.square.css('top', '100px');
	var prevTime2 = -1;
	(function loop(time) {
		//window.requestAnimationFrame(loop);
		setTimeout(function() {
			loop(Date.now());
		}, 1000/60);
		var delta = (prevTime2 === -1 ? 0 : time - prevTime2);
		prevTime2 = time;
		g2.update(delta);
		g2.render();
	})(-1)
});*/