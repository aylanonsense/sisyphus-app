$(document).ready(function() {
	if(false) {
		var socket = io.connect();
		var name = "";
		socket.emit('chat-join');
		socket.on('chat-list', function(data) {
			name = data.you;
			addToChat('You joined as ' + name);
			addToChat('Currently joined: ' + _.reduce(data.others, function(a, b, i) { return (i === 0 ? b : a + ', ' + b); }, ''));
		});
		socket.on('chat-leave', function(data) {
			addToChat(data.name + ' left');
		});
		socket.on('chat-join', function(data) {
			addToChat(data.name + ' joined');
		});
		socket.on('chat-talk', function(data) {
			addToChat('<b>' + data.name + ':</b> ' + data.msg);
		});
		$('#talk').on('keypress', function(evt) {
			if(evt.which === 13) {
				socket.emit('chat-talk', { msg: $(this).val()});
				addToChat('<b>' + name + ':</b> ' + $(this).val());
				$(this).val("");
			}
		});
		function addToChat(msg) {
			$('#chat').append($('<li>' + msg + '</li>'));
		}
	}
});