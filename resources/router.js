var config = require('./config.js');

function renderIndex(req, res) {
	if(req.session.count) {
		req.session.count++;
	}
	else {
		req.session.count = 1;
	}
	console.log(req.session.count + " visits");
	console.log(config.db.uri);
	console.log(config.session.secret);
	res.render('index.jade', {});
}

exports.renderIndex = renderIndex;