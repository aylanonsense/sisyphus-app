$(document).ready(function() {
	function getAllItems(callback) {
		$.get('/api/items', function(data) {
			console.log("GET /api/items", data);
			if(callback) callback();
		}, 'json');
	}
	function getItem(code, callback) {
		$.get('/api/item/' + code, function(data) {
			console.log("GET /api/item/" + code, data);
			if(callback) callback();
		}, 'json');
	}
	function postItem(data, callback) {
		$.post('/api/item', data, function(data) {
			console.log("POST /api/item", data);
			if(callback) callback();
		}, 'json');
	}

	postItem({ code: "hello"}, function() {
		getItem("hello", function() {
			getAllItems();
		})
	})
});