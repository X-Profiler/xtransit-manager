'use strict';

const crypto = require('crypto');
const moment = require('moment');

module.exports = {
  sign(message, secret) {
    if (typeof message !== 'string') {
      message = JSON.stringify(message);
    }
    return crypto.createHmac('sha1', secret).update(message).digest('hex');
  },

  formatLogTime(log) {
    const { log_time: time_str, log_timestamp } = log;
    log.log_time = log_timestamp ? moment(log_timestamp).format('YYYY-MM-DD HH:mm:ss') : time_str;
  },
};
