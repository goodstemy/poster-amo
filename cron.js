const cron = require('node-cron');
const util = require('./util');
const amo = require('./amo');

module.exports.startCron = async (accessToken) => {
  const cronConfig = await util.getCronConfig();
  if (!cronConfig || !cronConfig.schedule) {
    throw new Error('Cron config not found');
  }

  cron.schedule(cronConfig.schedule, async () => {
    console.logToTg('Start updating users in amo...');
    amo.updateUsers(accessToken).catch(console.logToTg);
  });

  cron.schedule(cronConfig.birthdaySchedule, async () => {
    console.logToTg('Start congrats users...');
    await amo.congratulate().catch(console.logToTg);
  });
};
