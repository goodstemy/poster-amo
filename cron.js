const cron = require('node-cron');
const util = require('./util');
const amo = require('./amo');

module.exports.startCron = async (accessToken) => {
  const cronConfig = await util.getCronConfig();
  if (!cronConfig || !cronConfig.schedule) {
    throw new Error('Cron config not found');
  }

  cron.schedule(cronConfig.schedule, () => {
    console.log('Start updating users in amo...');
    amo.updateUsers(accessToken).catch((err) => {
      throw new Error(err);
    });
  });
};
