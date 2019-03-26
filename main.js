const request = require('request');
const amo = require('./amo');

function getClients(accessToken) {
	return new Promise((resolve, reject) => {
		request(`https://joinposter.com/api/clients.getClients?token=${accessToken}`, (err, resp, body) => {
			if (err) reject(err);

			const parsedBody = JSON.parse(body);
			const clients = parsedBody.response;
			if (!clients) return;

			const clientsData = clients.map((client) => {
				const {
					client_id,
					firstname,
					lastname,
					card_number,
					phone_number,
					email,
					comment
				} = client;

				return {
					client_id,
					firstname,
					lastname,
					card_number,
					phone_number,
					email,
					comment
				}
			});

			resolve(clientsData);
		})
	});
}
