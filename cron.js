const cron = require('node-cron');
const util = require('./util');
const amo = require('./amo');

module.exports.startCron = async (accessToken) => {
  const cronConfig = await util.getCronConfig();
  if (!cronConfig || !cronConfig.schedule) {
    throw new Error('Cron config not found');
  }

  cron.schedule(cronConfig.schedule, () => {
    console.logToTg('Start updating users in amo...');
    amo.updateUsers(accessToken).catch(console.logToTg);

    setTimeout(() => {
      amo.congratulate().catch(console.logToTg);
    }, cronConfig.birthdayCongratsTimeout);
  });
};
