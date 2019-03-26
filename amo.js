const request = require('request');

require('dotenv').config();

const AUTH_URI = `https://${process.env.AMO_SUBDOMAIN}.amocrm.ru/private/api/auth.php?type=json`;

module.exports.amoAuthUri = AUTH_URI;

module.exports.auth = () => {
	return new Promise((resolve, reject) => {
		request.post(AUTH_URI, {form: {
			USER_LOGIN: process.env.AMO_USER_LOGIN,
			USER_HASH: process.env.AMO_USER_HASH
		}}, (err, resp, body) => {
			if (err || resp.statusCode !== 200) {
				reject(err);
			}

			console.log(body);
		})
	});
};
