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
	})(-1);/*

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
	})(-1)*/
});