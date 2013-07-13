var _ = require("underscore");
var chatroom = "chat";
var nextId = 0;
var guests = [];

function generateName(id) {
	return ["Ann", "Helga", "Britney", "Agatha", "Clementine"][id%5];
}
function onJoin(req) {
	var me = { id: nextId++, name: generateName(nextId), req: req };
	guests.push(me);
	req.io.join(chatroom);
	sendGuestList(me);
	req.io.room(chatroom).broadcast('chat-join', { name: me.name });
	req.socket.on('chat-talk', function(data) {
		req.io.room(chatroom).broadcast('chat-talk', { name: me.name, msg: data.msg });
	});
	req.socket.on('chat-leave', function() {
		removeGuest(me);
	});
	req.socket.on('disconnect', function() {
		removeGuest(me);
	});
}
function sendGuestList(me) {
	var otherGuests = _.map(_.without(guests, me), function(chatter) { return chatter.name; });
	me.req.io.emit('chat-list', { you: me.name, others: otherGuests });
}
function removeGuest(me) {
	guests.splice(guests.indexOf(me), 1);
	me.req.io.leave(chatroom);
	me.req.io.room(chatroom).broadcast('chat-leave', { name: me.name });
}

exports.onJoin = onJoin;