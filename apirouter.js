var models = require('./models');
var Item = models.Item;

function getItems(req, res) {
	Item.find(function(err, items) {
		if(err) {
			res.send({ successful: false, reason: "An error occurred", error: err });
		}
		else {
			res.send({ successful: true, items: items });
		}
	});
}
function getItemByCode(req, res) {
	Item.find({ code: req.params['code'] }, function(err, items) {
		if(err) {
			res.send({ successful: false, reason: "An error occurred", error: err });
		}
		else {
			res.send({ successful: true, item: items });
		}
	});
}
function createItem(req, res) {
	var item = new Item(req.body);
	item.save(function(err) {
		if(err) {
			res.send({ successful: false, reason: "An error occurred", error: err });
		}
		else {
			res.send({ successful: true });
		}
	});
}

exports.getItems = getItems;
exports.getItemByCode = getItemByCode;
exports.createItem = createItem;