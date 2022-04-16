'use strict';

const Subscription = require('egg').Subscription;

class MysqlSubscription extends Subscription {
  static get schedule() {
    return {
      cron: '0 0 3 * * *',
      type: 'worker',
      immediate: true,
    };
  }

  async subscribe() {
    const { ctx: { service: { mysql } } } = this;
    await mysql.cleanOsHistory();
    await mysql.cleanAlarmHistory();
    await mysql.cleanProcessHistory();
  }
}

module.exports = MysqlSubscription;
