const express = require('express');
const poster = require('./poster');
const amo = require('./amo');

const app = express();

app.get('/auth-poster', async (req, res) => {
  const {code, account} = req.query;
  if (!code || !account) {
    return res.send(500);
  }

  const accessToken = await poster.getToken(code).catch((err) => res.send(err));

  console.log(accessToken);
  // const clients = await getClients(accessToken).catch((err) => res.send(err));
});

app.get('/auth-amo', async (req, res) => {
  await amo.auth().catch((err) => res.send(err));
  // request.post()
  // getAMOToken();
});

app.listen(80, () => {
  const posterCodeUri = poster.buildGetTokenUri();
  console.log(`To authenticate poster go to:\n${posterCodeUri}\n`);
  console.log(`To authenticate amo go to:\n${amo.amoAuthUri}\n`);
  console.log('Listen on localhost:80\n');
});
