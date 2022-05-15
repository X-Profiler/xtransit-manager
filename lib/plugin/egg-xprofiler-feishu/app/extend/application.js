'use strict';

module.exports = {
  get feishu() {
    const app = this;
    return {
      post(webhook, title, content) {
        return app.curl(webhook, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          data: {
            msg_type: 'post',
            content: {
                post: {
                    zh_cn: {
                        title,
                        content,
                    }
                }
            },
          },
          timeout: 15 * 1000,
        });
      },
    };
  },
};
