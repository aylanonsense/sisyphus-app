var mongoose = require('mongoose');

var itemSchema = new mongoose.Schema({
	type: String,
	code: String,
	name: String,
	descr: String,
	cats: [ String ],
	examples: [{ descr: String, choices: [{ opts: [ String ] }] }],
	history: [{ status: String, date: { type: Date, default: Date.now } }],
	choices: [{
		code: String,
		name: String,
		descr: String,
		reqd: { type: Boolean, default: true },
		multi: { type: Boolean, default: false },
		defaults: [ String ],
		opts: [{
			code: String,
			name: String,
			descr: String,
			cost: { amt: Number, type: { type: String, default: "points" }}
		}]
	}]
});
var Item = mongoose.model('Item', itemSchema);

exports.Item = Item;