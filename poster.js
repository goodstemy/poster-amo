const request = require('request');

require('dotenv').config();

module.exports.buildGetTokenUri = () => {
  return `${process.env.POSTER_GET_CODE_URI}?application_id=${process.env.POSTER_APPLICATION_ID}` +
    `&redirect_uri=${process.env.POSTER_REDIRECT_URI}&response_type=code`;
};

module.exports.getToken = (code) => {
  return new Promise((resolve, reject) => {
    if (!code) {
      reject('Code is not defined');
    }

    request.post(process.env.POSTER_AUTH_URI, {form: {
        code,
        application_id: process.env.POSTER_APPLICATION_ID,
        application_secret: process.env.POSTER_APPLICATION_SECRET,
        redirect_uri: process.env.POSTER_REDIRECT_URI,
        grant_type: 'authorization_code',
      }}, (err, resp, body) => {
      if (err || resp.statusCode !== 200) {
        reject(err);
      }

      const {access_token} = JSON.parse(body);

      if (!access_token) {
        reject(`Access token is not defined`);
      }

      console.log(`Poster access token got successfuly`);

      resolve(access_token);
    })
  });
};
