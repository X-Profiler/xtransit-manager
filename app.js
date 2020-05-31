'use strict';

class AppBootHook {
  constructor(app) {
    this.app = app;
  }

  async didReady() {
    const { redis, config: { packageQueueKey } } = this.app;
    const { service: { redis: rdis, alarm } } = this.app.createAnonymousContext();

    while (true) {
      const pkgInfo = await redis.lpop(packageQueueKey);
      if (pkgInfo) {
        try {
          const { appId, agentId, packagePath } = JSON.parse(pkgInfo);
          const result = await rdis.checkModuleRisk(appId, agentId, packagePath);
          if (result && result.risk) {
            await alarm.judgeMetrics(appId, agentId, result.risk, 'xtransit_notification');
          }
        } catch (err) {
          this.app.logger.error(`handle package queue failed: ${err}`);
          await redis.rpush(packageQueueKey, pkgInfo);
        }
      }

      // sleep for 10s
      await new Promise(resolve => setTimeout(resolve, 10 * 1000));
    }
  }
}

module.exports = AppBootHook;
