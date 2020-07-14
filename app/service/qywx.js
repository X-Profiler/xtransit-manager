'use strict';

const Service = require('egg').Service;

class WxService extends Service {
  async sendMessage(appId, agentId, context, strategy, message) {
    const { webhook, wtype, waddress, wsign } = strategy;
    if (!webhook || wtype !== 'qywx') {
      return;
    }

    const { ctx: { app: { qywx }, service: { mysql, alarm } } } = this;
    const result = await alarm.debounceMessage(appId, agentId, context, strategy, message, 'qywx');
    if (!result) {
      return;
    }

    const { name } = await mysql.getAppByAppId(appId);
    const { list, appLink, detailLink, periodDesc } = result;
    const alarmMessage = `您的应用 [${name || appId}](${appLink}) 在实例 ${agentId} 于 ${periodDesc} 发生 ${list.length} 条告警: ${message}`
      + `，点击 [控制台](${detailLink}) 查看详细信息`;
    await qywx.markdown(waddress, wsign, alarmMessage);
  }
}

module.exports = WxService;
