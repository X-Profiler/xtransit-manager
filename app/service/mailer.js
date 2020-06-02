'use strict';

const Service = require('egg').Service;

class MailerService extends Service {
  async sendMessage(appId, agentId, context, strategy, message) {
    const { ctx, ctx: { app: { mailer, config: { mailer: { auth } } }, service: { alarm, mysql } } } = this;

    const result = await alarm.prepareSend(appId, agentId, context, strategy, message, 'mailer');
    if (!result) {
      return;
    }

    // get render page
    const { contacts, list, appLink, detailLink, periodDesc } = result;
    const [app, users] = await Promise.all([
      mysql.getAppByAppId(appId),
      mysql.getUserByUserIds(contacts.map(contact => contact.user)),
    ]);
    const renderData = {
      appLink, agentId, periodDesc,
      list, detailLink,
      appInfo: app.name || appId,

    };
    const html = await ctx.renderView('mailer', renderData);

    // send email
    mailer.sendMail({
      from: auth.user,
      to: users.map(user => user.mail).join(','),
      subject: 'Easy-Monitor 性能监控',
      // text: content,
      html,
    });
  }
}

module.exports = MailerService;
