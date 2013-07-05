function renderIndex(req, res) {
	res.render('index.jade', {
		title: 'my blog'
	});
}
function renderControlPanel(req, res) {
	res.render('controlpanel.jade', {});
}

exports.renderIndex = renderIndex;
exports.renderControlPanel = renderControlPanel;