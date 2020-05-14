'use strict';

const crypto = require('crypto');

module.exports = {
  sign(secret, message) {
    return crypto.createHmac('sha1', secret).update(message).digest('hex');
  },
};
