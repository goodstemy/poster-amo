const fs = require('fs');

module.exports.getCronConfig = () => {
  return JSON.parse(fs.readFileSync('./cron.config.json').toString());
};
