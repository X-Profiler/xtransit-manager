'use strict';

const crypto = require('crypto');

module.exports = {
  sign(message, secret) {
    if (typeof message !== 'string') {
      message = JSON.stringify(message);
    }
    return crypto.createHmac('sha1', secret).update(message).digest('hex');
  },
};
