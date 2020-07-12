'use strict';

module.exports = {
  get qywx() {
    const app = this;
    return {
      markdown(webhook, secret, content) {
        // const webhook = `https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key==${accessToken}`;
        secret; // unused

        const url = `${webhook}`;
        return app.curl(url, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          data: {
            msgtype: 'markdown',
            markdown: {
              content: '[Easy-Monitor 性能监控] ' + content,
            },
          },
          timeout: 15 * 1000,
        });
      },
    };
  },
};
