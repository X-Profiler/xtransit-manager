'use strict';

const Subscription = require('egg').Subscription;

class RedisSubscription extends Subscription {
  static get schedule() {
    return {
      cron: '0 0 3 * * *',
      type: 'worker',
      immediate: true,
    };
  }

  async subscribe() {
    const { ctx: { service: { redis } } } = this;
    await redis.cleanExpiredFile();
    await redis.cleanExpiredXtransit();
  }
}

module.exports = RedisSubscription;
