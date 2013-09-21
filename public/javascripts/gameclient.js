var GameClient = (function() {
	var GamePlayer = GameCommon.GamePlayer;
	var Game = GameCommon.Game;
	var Connection = GameCommon.Connection;
	var DelayCalculator = GameCommon.DelayCalculator;
	var DelayCalculatorEvaluator = GameCommon.DelayCalculatorEvaluator;
	var DelayVisualizer = GameCommon.DelayVisualizer;

/*
	GameRunner
		start()
		stop()
	DelayManager
		manageDelay()
	Controller
		handleControl(control)
		onCommand(callback)
	Renderer
		setRenderTarget(ele)
		render(state)
		onInputEventFired(callback)
	InputListener
		handleInput(input)
		onControl(control)
	NetworkHandler
		sendCommand(command, time)
		onReceiveState(callback)
		onReceiveDelta(callback)
	Socket
		emit(messageType, message)
		on(messageType, callback)
*/

	function GameRunner(params) {
		var self = this;
		this._timer = null;
		this._renderer = new Renderer();
		this._renderer.setRenderTarget(params.renderTarget);
		this._inputListener = new InputListener();
		this._controller = new Controller();
		this._networkHandler = new NetworkHandler();
		this._gamePlayer = new GamePlayer({ maxRewind: params.maxRewind });
		this._delayManager = new DelayManager();

		this._renderer.onInputEventFired(function(input) {
			self._inputListener.handleInput(input);
		});
		this._inputListener.onControl(function(control) {
			self._controller.handleControl(control);
		});
		this._controller.onCommand(function(command) {
			var time = self._gamePlayer.getSplitSecondTime();
			self._networkHandler.sendCommand(command, time);
		});
		this._networkHandler.onReceiveDelta(function(delta, time) {
			self._delayManager.manageDelay(self._gamePlayer, time);
			self._gamePlayer.handleDelta(delta, 'SERVER', time);
		});
		this._networkHandler.onReceiveState(function(state, time) {
			self._gamePlayer.setStateAndTime(state, time);
		});
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
		this._gamePlayer.update(ms);
		var state = this._gamePlayer.getState();
		state.ping = this._networkHandler.getPing();
		state.delay = this._delayManager.getDelay();
		this._renderer.render(state);
	};
	GameRunner.prototype.stop = function() {
		if(this._timer !== null) {
			clearInterval(this._timer);
			this._timer = null;
		}
	};



	function DelayManager() {
		this._delayCalc = new DelayCalculator();
	}
	DelayManager.prototype.manageDelay = function(game, time) {
		var now = game.getSplitSecondTime();
		var actualDelay = now - time;
		var prevIdealDelay = this._delayCalc.getDelay();
		if(actualDelay > 0) {
			this._delayCalc.addDelay(actualDelay);
		}
		else {
			this._delayCalc.addDelay(0);
		}
		var idealDelay = this._delayCalc.getDelay();
		//console.log(actualDelay, now, time, idealDelay);
		if(idealDelay !== prevIdealDelay) {
			var ms;
			//speed up or skip forward!
			if(actualDelay > idealDelay) {
				ms = actualDelay - idealDelay;
				game.speedUp(ms, 500);
				//console.log("Speeding game up by " + ms);
			}
			//slow down or pause!
			else {
				ms = idealDelay - actualDelay;
				game.slowDown(ms, 1000);
				//console.log("Slowing game down by " + ms);
			}
		}
	};
	DelayManager.prototype.getDelay = function() {
		return this._delayCalc.getDelay();
	};



	function Controller() {
		this._commandCallbacks = [];
	}
	Controller.prototype.onCommand = function(callback) {
		this._commandCallbacks.push(callback);
	};
	Controller.prototype._fireCommand = function(command) {
		this._commandCallbacks.forEach(function(callback) {
			callback(command);
		});
	};
	Controller.prototype.handleControl = function(control) {
		if(control.type === 'DIR') {
			this._fireCommand({
				type: 'SET_MY_DIR',
				horizontal: control.horizontal,
				vertical: control.vertical
			});
		}
		else if(control.type === 'CONFIRM') {
			this._fireCommand({
				type: 'SPAWN_ME'
			});
		}
	};



	function Renderer() {
		var self = this;
		this._inputCallbacks = [];
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
	Renderer.prototype.setRenderTarget = function(ele) {
		ele.append(this._root);
	};
	Renderer.prototype.render = function(state) {
		var t;
		var self = this;
		this._root.empty();
		state.entities.forEach(function(entity) {
			$('<div style="position:absolute;width:25px;height:25px;"></div>')
				.css('left', entity.x + 'px')
				.css('top', entity.y + 'px')
				.css('background-color', entity.color)
				.appendTo(self._root);
		});

		//show gametime
		t = '' + (Math.floor(state.time) / 1000);
		if(t.indexOf('.') === -1) {
			t = t + '.000';
		}
		while(t.length - t.indexOf('.') < 4) {
			t = t + '0';
		}
		$('<p><b>time:</b> ' + t + '</p>').css({
			position: 'absolute',
			top: 0,
			right: 0,
			padding: 0,
			margin: 0
		}).appendTo(this._root);

		//show time multiplier
		if(state.timeMultiplier !== 1) {
			t = '' + (Math.floor(1000 * state.timeMultiplier) / 10);
			if(t.indexOf('.') === -1) {
				t = t + '.0';
			}
			if(state.timeMultiplier < 1) {
				t = 'SLOW ' + t;
			}
			else {
				t = 'FAST ' + t;
			}
			$('<p><b>speed:</b> ' + t + '%</p>').css({
				position: 'absolute',
				bottom: 0,
				right: 0,
				padding: 0,
				margin: 0
			}).appendTo(this._root);
		}

		//show ping
		$('<p><b>latency:</b> ' + Math.floor(state.ping) + 'ms</p>').css({
			position: 'absolute',
			bottom: 0,
			left: 0,
			padding: 0,
			margin: 0
		}).appendTo(this._root);

		//show delay
		$('<p><b>delay:</b> ' + Math.floor(state.delay) + 'ms</p>').css({
			position: 'absolute',
			bottom: '20px',
			left: 0,
			padding: 0,
			margin: 0
		}).appendTo(this._root);
	};
	Renderer.prototype.onInputEventFired = function(callback) {
		this._inputCallbacks.push(callback);
	};
	Renderer.prototype._fireInputEvent = function(input) {
		this._inputCallbacks.forEach(function(callback) {
			callback(input);
		});
	};



	function InputListener() {
		this._up = false;
		this._down = false;
		this._left = false;
		this._right = false;
		this._horizontal = 0;
		this._vertical = 0;
		this._controlCallbacks = [];
	}
	InputListener.prototype.onControl = function(callback) {
		this._controlCallbacks.push(callback);
	};
	InputListener.prototype.handleInput = function(input) {
		var control = this._toControl(input);
		if(control !== null) {
			this._controlCallbacks.forEach(function(callback) {
				callback(control);
			});
		}
	};
	InputListener.prototype._toControl = function(input) {
		if(input.device === 'KEYBOARD') {
			if(input.event === 'PRESS') {
				if(input.key === 13) { // Enter
					return { type: 'CONFIRM' };
				}
				else if(input.key === 87 || input.key === 83 || input.key === 65 || input.key === 68) {
					if(input.key === 87) { // W
						this._up = true;
						this._vertical = -1;
					}
					else if(input.key === 83) { // S
						this._down = true;
						this._vertical = 1;
					}
					else if(input.key === 65) { // A
						this._left = true;
						this._horizontal = -1;
					}
					else if(input.key === 68) { // D
						this._right = true;
						this._horizontal = 1;
					}
					return { type: 'DIR', horizontal: this._horizontal, vertical: this._vertical };
				}
			}
			else if(input.event === 'RELEASE') {
				if(input.key === 87 || input.key === 83 || input.key === 65 || input.key === 68) {
					if(input.key === 87) { // W
						this._up = false;
						this._vertical = (this._down ? 1: 0);
					}
					else if(input.key === 83) { // S
						this._down = false;
						this._vertical = (this._up ? -1 : 0);
					}
					else if(input.key === 65) { // A
						this._left = false;
						this._horizontal = (this._right ? 1 : 0);
					}
					else if(input.key === 68) { // D
						this._right = false;
						this._horizontal = (this._left ? -1 : 0);
					}
					return { type: 'DIR', horizontal: this._horizontal, vertical: this._vertical };
				}
			}
		}
		return null;
	};



	function NetworkHandler() {
		var self = this;
		this._conn = new Connection({
			socket: new Socket(),
			maxMessagesSentPerSecond: 10000,
			simulatedLag: {
				min: 80,
				max: 120,
				spikeChance: 0.03
			}
		});
		this._receiveDeltaCallbacks = [];
		this._receiveStateCallbacks = [];
		this._conn.onReceive(function(message) {
			if(message.type === 'DELTA') {
				self._receiveDeltaCallbacks.forEach(function(callback) {
					callback(message.delta, message.time);
				});
			}
			if(message.type === 'STATE') {
				self._receiveStateCallbacks.forEach(function(callback) {
					callback(message.state, message.time);
				});
			}
		});
	}
	NetworkHandler.prototype.sendCommand = function(command, time) {
		this._conn.send({ type: 'COMMAND', command: command, time: time });
	};
	NetworkHandler.prototype.onReceiveDelta = function(callback) {
		this._receiveDeltaCallbacks.push(callback);
	};
	NetworkHandler.prototype.onReceiveState = function(callback) {
		this._receiveStateCallbacks.push(callback);
	};
	NetworkHandler.prototype.getPing = function() {
		return this._conn.getPing();
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
	var game = new GameClient({
		renderTarget: $('#game-area'),
		maxRewind: 100000
	});
	game.start();



	new GameCommon.DelayCalculatorTester([ GameCommon.DelayCalculator ], $('<div></div>').appendTo('body'), 150, 200);
});
