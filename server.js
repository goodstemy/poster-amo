const express = require('express');
const bodyParser = require('body-parser');
const Bot = require('node-telegram-bot-api');
const poster = require('./poster');
const amo = require('./amo');
const cron = require('./cron');

const app = express();
const bot = new Bot(process.env.TG_BOT_TOKEN, { polling: true });
const TG_CHANNEL_ID = -1001460429000;

console.__proto__.logToTg = (msg) => {
  bot.sendMessage(TG_CHANNEL_ID, msg);
};

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

  console.logToTg(`Access token: ${beautifyAccessToken(tk)}`);
  console.logToTg(`To authenticate amo go to:\n${amo.amoAuthUri}\n`);

  res.send(`Access token: ${beautifyAccessToken(tk)}
    <br/>
    Authenticate amocrm by go to: <a href="http://${process.env.SERVER_URI}/auth-amo"> this link </a>
  `);
});

app.get('/auth-amo', async (req, res) => {
  await amo.auth().catch(res.send);

  console.logToTg(`Amo authenticated successful`);

  amo.updateUsers(tk);

  res.send('Authenticated!');

  cron.startCron(tk);
});

app.post('/client-payed', (req, res) => {
  if (!req.body) {
    res.send(500);
    return console.logToTg('Body are empty');
  }

  if (!tk) {
    return res.sendStatus(200);
  }

  const {
    object_id: objectId,
    time,
    data: {
      value_relative: amount
    }
  } = req.body;

  process.nextTick(() => {
    amo.recordPurchase({
      objectId,
      time,
      amount
    })
    .catch(console.logToTg);
  });

  res.sendStatus(200)
});

app.listen(80, () => {
  console.log(`Listen on ${process.env.SERVER_URI}:80\n`);
  const posterCodeUri = poster.buildGetTokenUri();
  console.log(`To start go to:\nhttp://${process.env.SERVER_URI}/\n`);
});

