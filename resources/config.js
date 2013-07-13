exports.db = {
	uri: (process.env.DB_URI || 'mongodb://localhost/test')
};
exports.session = {
	secret: (process.env.SESSION_SECRET || 'asupersecuresecret')
};;