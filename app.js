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
        this.app.logger.info(`start handle package: ${pkgInfo}...`);
        try {
          const { appId, agentId, packagePath } = JSON.parse(pkgInfo);
          const result = await rdis.checkModuleRisk(appId, agentId, packagePath, { forceCache: true });
          if (result && result.risk) {
            const context = Object.assign({}, result.risk, result.risk.vulnerabilities);
            await alarm.judgeMetrics(appId, agentId, context, 'xtransit_notification');
            this.app.logger.info(`package: ${pkgInfo} audit saved.`);
          } else {
            throw new Error(`get package audit failed`);
          }
        } catch (err) {
          this.app.logger.error(`handle package ${pkgInfo} failed: ${err.message}`);
          await redis.rpush(packageQueueKey, pkgInfo);
        }
      }

      // sleep for 10s
      await new Promise(resolve => setTimeout(resolve, 10 * 1000));
    }
  }
}

module.exports = AppBootHook;
