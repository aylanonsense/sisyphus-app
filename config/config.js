//if it becomes necessary, this is where changing configs based on NODE_ENV should be performed
module.exports = {
	db: {
		uri: (process.env.DB_URI || 'mongodb://localhost/test')
	},
	session: {
		secret: (process.env.SESSION_SECRET || 'asupersecuresecret')
	},
	server: {
		port: (process.env.PORT || 3000),
		securePort: (process.env.SSL_PORT || 3001)
	}
};