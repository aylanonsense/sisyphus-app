$(document).ready(function() {
	console.log("Connecting...");
	var socket = io.connect();
	socket.emit('ready');
	socket.on('talk', function (data) {
		console.log("Data from the server:", data);
	});
});