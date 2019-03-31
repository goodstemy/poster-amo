const r = require('request');
const poster = require('./poster');
const enums = require('./enums');

require('dotenv').config();

const j = r.jar();
const request = r.defaults({jar:j});

const AUTH_URI = `https://${process.env.AMO_SUBDOMAIN}.amocrm.ru/private/api/auth.php?type=json`;
const AMO_API_CONTACTS = `https://${process.env.AMO_SUBDOMAIN}.amocrm.ru/api/v2/contacts`;
const DEFAULT_CLIENTS_RANGE = 500;

let totalClients = 0;

module.exports.amoAuthUri = AUTH_URI;

function validURL(str) {
	const pattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
		'((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name
		'((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
		'(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
		'(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
		'(\\#[-a-z\\d_]*)?$','i'); // fragment locator
	return !!pattern.test(str);
}

function getUserData(formData, clients) {
	for (let i = 0; i < clients.length; i++) {
		const user = clients[i];

		const userData = {
			id: user.client_id,
			name: `${user.firstname} ${user.lastname}`,
			custom_fields: [
				{
					id: enums.CARD_NUMBER,
					name: 'Номер карты',
					values: [
						{
							value: user.card_number
						}
					]
				},
				{
					id: 120073,
					name: 'Номер телефона',
					code: 'PHONE',
					values: [
						{
							value: user.phone_number,
							enum: 275283
						}
					],
					is_system: true
				},
			]
		};

		if (user.email) {
			userData.custom_fields.push({
				id: 120075,
				name: 'Почта',
				code: 'EMAIL',
				values: [
					{
						value: user.email,
						enum: 275295
					}
				]
			});
		}

		if (user.comment && validURL(user.comment)) {
			userData.custom_fields.push({
				id: 132715,
				name: 'Соц. сеть',
				values: [
					{
						value: user.comment
					}
				],
				"is_system": false
			});
		}

		formData.add.push(userData);
	}
}

module.exports.auth = () => {
  return new Promise((resolve, reject) => {
    request.post(AUTH_URI, {
      form: {
        USER_LOGIN: process.env.AMO_USER_LOGIN,
        USER_HASH: process.env.AMO_USER_HASH,
      },
    }, (err, resp, body) => {
      if (err || resp.statusCode !== 200) {
        return reject(err);
      }

      resolve();
    })
  });
};

module.exports.updateUsers = async (accessToken) => {
  const clients = await poster.getClients(accessToken).catch((err) => {
  	throw new Error(err);
	});

  console.time('Uploading clients finished in');
  for (let i = 0; i < clients.length; i += DEFAULT_CLIENTS_RANGE) {
		const formData = {
			add: []
		};

		if (clients.length < i + DEFAULT_CLIENTS_RANGE) {
			getUserData(formData, clients.slice(i, clients.length));
		} else {
			getUserData(formData, clients.slice(i, i + DEFAULT_CLIENTS_RANGE));
		}

		try {
			await saveUsers(formData);
		} catch (err) {
			console.error(err);
		}
	}
	console.timeEnd('Uploading clients finished in');
};

async function saveUsers(formData) {
	return new Promise((resolve, reject) => {
		request({
			uri: AMO_API_CONTACTS,
			headers: {
				'Content-Type': 'application/json'
			},
			method: 'POST',
			body: JSON.stringify(formData),
		}, (err, resp, body) => {
			if (err || resp.statusCode !== 200) {
				return reject(err);
			}

			const response = JSON.parse(body).response;
			if (response) {
				return reject(`Error with uploading: ${response.error}`);
			}

			totalClients += formData.add.length;

			console.log(`${totalClients} clients uploaded`);
			resolve();
		});
	})
}

// FIXME: using only for debugging. Remove on production
process.on('unhandledRejection', (reason, promise) => {
	console.log('Unhandled Rejection at:', reason.stack || reason)
});
