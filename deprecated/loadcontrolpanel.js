$(document).ready(function() {

	function getAllItems(callback) {
		$.get('/api/items', function(data) {
			console.log("GET /api/items", data);
			if(callback) callback(data);
		}, 'json');
	}
	function getItem(code, callback) {
		$.get('/api/item/' + code, function(data) {
			console.log("GET /api/item/" + code, data);
			if(callback) callback(data);
		}, 'json');
	}
	function createItem(data, callback) {
		$.post('/api/item', data, function(data) {
			console.log("POST /api/item", data);
			if(callback) callback(data);
		}, 'json');
	}
	function removeItem(code, callback) {
		$.delete('/api/item/' + code, data, function(data) {
			console.log("DELETE /api/item", data);
			if(callback) callback(data);
		}, 'json');
	}

	getAllItems(function(data) {
		data.items.forEach(function(item) {
			$('.items').append($('<li>' + item.code + '</li>'));
		});
	});
});