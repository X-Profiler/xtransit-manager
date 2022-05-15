'use strict';

const Service = require('egg').Service;

class FeishuService extends Service {
  async sendMessage(appId, agentId, context, strategy, message) {
    const { webhook, wtype, waddress, } = strategy;
    if (!webhook || wtype !== 'feishu') {
      return;
    }

    const { ctx: { app: { feishu }, service: { mysql, alarm } } } = this;
    const result = await alarm.debounceMessage(appId, agentId, context, strategy, message, 'feishu');
    if (!result) {
      return;
    }

    const { name } = await mysql.getAppByAppId(appId);
    const { list, appLink, detailLink, periodDesc } = result;

    // https://open.feishu.cn/document/ukTMukTMukTM/ucTM5YjL3ETO24yNxkjN
    await feishu.post(waddress, '[Easy-Monitor 性能监控]', [[
        {
            tag: 'text',
            text: '您的应用'
        },
        {
            tag: 'a',
            text: name || appId,
            href: appLink,
        },
        {
            tag: 'text',
            text: `在实例 ${agentId} 于 ${periodDesc} 发生 ${list.length} 条告警: ${message}`
        },
        {
            tag: 'text',
            text: '点击',
        },
        {
            tag: 'a',
            text: '控制台',
            href: detailLink,
        },
        {
            tag: 'text',
            text: '查看详细信息'
        }
    ]]);
  }
}

module.exports = FeishuService;
