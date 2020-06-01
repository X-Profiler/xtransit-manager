'use strict';

const crypto = require('crypto');

module.exports = {
  get dingtalk() {
    const app = this;
    return {
      markdown(webhook, secret, content) {
        // const webhook = `https://oapi.dingtalk.com/robot/send?access_token=${accessToken}`;
        const timestamp = Date.now();
        const signature = encodeURIComponent(crypto.createHmac('sha256', secret)
          .update(timestamp + '\n' + secret)
          .digest('base64'));
        const url = `${webhook}&sign=${signature}&timestamp=${timestamp}`;
        return app.curl(url, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          data: {
            msgtype: 'markdown',
            markdown: {
              title: 'Easy-Monitor 性能监控',
              text: '[Easy-Monitor 性能监控] ' + content,
              at: {
                isAtAll: false,
              },
            },
          },
          timeout: 15 * 1000,
        });
      },
    };
  },
};
