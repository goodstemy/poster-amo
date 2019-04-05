const r = require('request');
const poster = require('./poster');
const enums = require('./enums');

require('dotenv').config();

const j = r.jar();
const request = r.defaults({jar:j});

const AUTH_URI = `https://${process.env.AMO_SUBDOMAIN}.amocrm.ru/private/api/auth.php?type=json`;
const AMO_API_CONTACTS = `https://${process.env.AMO_SUBDOMAIN}.amocrm.ru/api/v2/contacts`;
const AMO_BIRTHDAY_URI = `https://${process.env.AMO_SUBDOMAIN}.amocrm.ru/api/v2/leads`;
const DEFAULT_CLIENTS_RANGE = 250;

let totalClients = 0;

module.exports.amoAuthUri = AUTH_URI;

async function req(url) {
  return new Promise( (resolve, reject) => {
    request(url, async (err, resp, body) => {
      if (err) {
        return reject(err);
      }

      if (!body && resp.statusCode === 204) {
        return resolve([]);
      }

      const b = JSON.parse(body);

      if (!b || !b._embedded) {
        return resolve([]);
      }

      resolve(b._embedded.items);
    })
  });
}

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
					name: '№ карты',
					values: [
						{
							value: user.card_number
						}
					],
          is_system: false
				},
				{
					id: enums.PHONE,
					name: 'Телефон',
					code: 'PHONE',
					values: [
						{
							value: user.phone,
							enum: 275283
						}
					],
					is_system: true
				},
        {
          id: 154349,
          name: 'PosterID',
          values: [
            {
              value: user.client_id
            }
          ],
          is_system: false
        }
			]
		};

		if (user.email) {
			userData.custom_fields.push({
				id: enums.EMAIL,
				name: 'Почта',
				code: 'EMAIL',
				values: [
					{
						value: user.email,
						enum: 275295
					}
				],
        is_system: true
      });
		}

		if (user.birthday) {
      userData.custom_fields.push({
        id: enums.BIRTHDAY,
        name: 'День рождения',
        values: [
          {
            value: `${user.birthday} 00:00:00`,
          }
        ],
        is_system: false
      });
    }

		if (user.comment && validURL(user.comment)) {
		  if (user.comment.indexOf('vk.com') + 1) {
        userData.custom_fields.push({
          id: enums.VK,
          name: 'VK профиль',
          values: [
            {
              value: user.comment
            }
          ],
          "is_system": false
        });
      } else if (user.comment.indexOf('instagram.com') + 1) {
        userData.custom_fields.push({
          id: enums.INSTAGRAM,
          name: 'Instagram',
          values: [
            {
              value: user.comment
            }
          ],
          "is_system": false
        });
      }
		}

		formData.add.push(userData);
	}
}

async function getContacts() {
  const contacts = [];

  for (let i = 0;;i += 500) {
    const r = await req(`${AMO_API_CONTACTS}?limit_rows=500&limit_offset=${i}`);

    if (!r.length) {
      break;
    }

    contacts.push(...r);
  }

  return contacts;
}

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
      if (err) {
        return reject(err);
      }

      if (resp.statusCode === 504) {
        saveUsers(formData);
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

function isBirthday(user) {
  if (!user || !user.custom_fields) {
    return false;
  }

  let birthdayDate;

  for (let i = 0; i < user.custom_fields.length; i++) {
    if (user.custom_fields[i].id === enums.BIRTHDAY) {
      birthdayDate = user.custom_fields[i].values[0].value;
    }
  }

  if (!birthdayDate) {
    return false;
  }

  birthdayDate = new Date(birthdayDate);
  const todayDate = new Date();

  return birthdayDate.getDate() === todayDate.getDate() && birthdayDate.getMonth() === todayDate.getMonth();
}

function sendCongrats(id) {
  id = '37587333';

  if (!id) {
    return;
  }

  const postData = {
    add: [
      {
        name: "День рождения",
        sale: 1,
        contacts_id: [
          id
        ]
      }
    ]
  };

  return new Promise((resolve, reject) => {
    request({
      uri: AMO_BIRTHDAY_URI,
      headers: {
        'Content-Type': 'application/json'
      },
      method: 'POST',
      body: JSON.stringify(postData),
    }, (err, resp, body) => {
      if (err) {
        return reject(err);
      }
//43200000
      console.log(`User with id ${id} congratulated!`);
      resolve();
    });
  });
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

  const contacts = await getContacts().catch((err) => {
    throw new Error(err);
  });

  const cardNumberList = [];

  for (let i = 0; i < contacts.length; i++) {
    const contact = contacts[i];

    for (let k = 0; k < contact.custom_fields.length; k++) {
      const field = contact.custom_fields[k];

      if (field.id === enums.POSTER_ID) {
        cardNumberList.push(field.values[0].value);
        break;
      }
    }
  }

  const newClients = clients.filter((el) => !cardNumberList.includes(el.client_id));

  console.log(`New clients: ${newClients.length}`);

  console.time('Uploading clients finished in');
  for (let i = 0; i < newClients.length; i += DEFAULT_CLIENTS_RANGE) {
		const formData = {
			add: []
		};

		if (newClients.length < i + DEFAULT_CLIENTS_RANGE) {
			getUserData(formData, newClients.slice(i, newClients.length));
		} else {
			getUserData(formData, newClients.slice(i, i + DEFAULT_CLIENTS_RANGE));
		}

		try {
			await saveUsers(formData);
		} catch (err) {
			console.error(err);
		}
	}
	console.timeEnd('Uploading clients finished in');
};

module.exports.congratulate = async () => {
  const contacts = await getContacts();
  const birthdaysList = contacts.filter(isBirthday);

  for (let i = 0; i < birthdaysList.length; i++) {
    console.log('Todays birthday: ', birthdaysList[i].name);
    await sendCongrats(birthdaysList[i].id);
  }
};

// FIXME: using only for debugging. Remove on production
process.on('unhandledRejection', (reason, promise) => {
	console.log('Unhandled Rejection at:', reason.stack || reason)
});
