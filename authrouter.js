var _ = require('underscore');
var models = require('./models');
var User = models.User;

function showRegisterForm(req, res) {
	res.render('register.jade', {
		form: {
			username: '',
			email: ''
		}
	});
}
function register(req, res) {
	var user = new User({
		username: req.body.username,
		email: req.body.email,
		password: req.body.password,
		isAdmin: true
	});
	var cleanErrors;
	user.save(function(err) {
		if(err) {
			res.render('register.jade', {
				errors: err,
				form: {
					username: req.body.username,
					email: req.body.email
				}
			});
		}
		else {
			res.render('login.jade', {
				justRegistered: true,
				form: {
					username: req.body.username
				}
			});
		}
	});
}
function showAdminConsole(req, res) {
	User.find({}, function(err, users) {
		res.render('admin.jade', {
			users: users
		});
	});
}
function showLoginForm(req, res) {
	res.render('login.jade', {
		form: {
			username: ''
		}
	});
}
function login(req, res) {
	User.findOne({ username: req.body.username }, function(err, user) {
		var loginSuccessful = false;
		if(err) {
			res.render('login.jade', {
				errors: err,
				form: {
					username: req.body.username
				}
			});
		}
		else {
			if(user) {
				if(user.authenticate(req.body.password)) {
					loginSuccessful = true;
				}
			}
			if(loginSuccessful) {
				req.session.user_id = user.id;
				res.redirect('main');
			}
			else {
				res.render('login.jade', {
					errors: [ true ],
					form: {
						username: req.body.username
					}
				});
			}
		}
	});
}

exports.showRegisterForm = showRegisterForm;
exports.register = register;
exports.showAdminConsole = showAdminConsole;
exports.showLoginForm = showLoginForm;
exports.login = login;