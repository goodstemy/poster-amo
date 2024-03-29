const express = require('express');
const bodyParser = require('body-parser');
const Bot = require('node-telegram-bot-api');
const poster = require('./poster');
const amo = require('./amo');
const cron = require('./cron');

const app = express();
const bot = (process.env.NODE_ENV  === 'production') ? new Bot(process.env.TG_BOT_TOKEN, { polling: true }) : null;
const TG_CHANNEL_ID = -1001460429000;

console.__proto__.logToTg = (msg) => {
  if (process.env.NODE_ENV === 'production') {
    return bot.sendMessage(TG_CHANNEL_ID, msg);
  }

  console.log(msg);
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

  cron.startCron(tk).catch(console.logToTg);

  console.logToTg(`Access token: ${beautifyAccessToken(tk)}`);
  res.send(`Access token: ${beautifyAccessToken(tk)}`);
});

app.post('/client-payed', async (req, res) => {
  if (!req.body) {
    res.send(500);
    return console.logToTg('Body are empty');
  }

  if (!tk) {
    return res.sendStatus(200);
  }

  console.log(req.body);

  const {
    object_id: objectId,
    time,
  } = req.body;

  const amount = JSON.parse(req.body.data).value_relative;

  await amo.auth().catch(res.send);
  await amo.recordPurchase({
    objectId,
    time,
    amount
  })
  .catch(console.logToTg);

  res.sendStatus(200)
});

app.listen(80, () => {
  console.log(`Listen on ${process.env.SERVER_URI}:80\n`);
  console.log(`To start go to:\nhttp://${process.env.SERVER_URI}/\n`);
});

// FIXME: using only for debugging. Remove on production
process.on('unhandledRejection', (reason, promise) => {
  console.logToTg('Unhandled Rejection at:', reason.stack || reason)
});

