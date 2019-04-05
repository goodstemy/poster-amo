const express = require('express');
const bodyParser = require('body-parser');
const poster = require('./poster');
const amo = require('./amo');
const cron = require('./cron');

const app = express();

let tk = '';

app.use(bodyParser.json());

function beautifyAccessToken(tk) {
  if (!tk) {
    throw new Error('Token is not provided');
  }

  let res = `${tk.split('').slice(0, 3).join('')}`;

  for (let i = 0; i < Math.floor(Math.random() * 100); i++) {
    res += '*'
  }

  return res += `${tk.split('').slice(-3).join('')}\n`;
}

app.get('/', (req, res) => {
  const posterCodeUri = poster.buildGetTokenUri();

  res.send(`
    To authenticate poster go to: <a href="${posterCodeUri}">this link</a>
  `);
});

app.get('/auth-poster', async (req, res) => {
  const {code, account} = req.query;
  if (!code || !account) {
    return res.send(500);
  }

  try {
    tk = await poster.getToken(code);
  } catch (err) {
    return res.send(err);
  }

  console.log(`Access token: ${beautifyAccessToken(tk)}`);
  console.log(`To authenticate amo go to:\n${amo.amoAuthUri}\n`);

  res.send(`Access token: ${beautifyAccessToken(tk)}
    <br/>
    Authenticate amocrm by go to: <a href="http://${process.env.SERVER_URI}/auth-amo"> this link </a>
  `);
});

app.get('/auth-amo', async (req, res) => {
  await amo.auth().catch((err) => res.send(err));

  console.log(`Amo authenticated successful`);

  // amo.updateUsers(tk);
  // amo.congratulate().catch((err) => console.error(err));

  res.send('Authenticated!');

  cron.startCron(tk);
});

app.post('/client-payed', (req, res) => {
  console.log(req.body);
  res.send(200, '')
});

app.listen(80, () => {
  console.log(`Listen on ${process.env.SERVER_URI}:80\n`);
  const posterCodeUri = poster.buildGetTokenUri();
  console.log(`To start go to:\nhttp://${process.env.SERVER_URI}/\n`);
});

