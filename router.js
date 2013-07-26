function renderIndex(req, res) {
	/*if(req.session.count) {
		req.session.count++;
	}
	else {
		req.session.count = 1;
	}
	console.log(req.session.count + " visits");*/
	res.render('index.jade', {});
}

exports.renderIndex = renderIndex;