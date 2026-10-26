'use strict';

class AppBootHook {
  constructor(app) {
    this.app = app;
  }

  async checkResisQueue() {
    const { redis, config: { packageQueueKey } } = this.app;
    const { service: { redis: rdis, alarm } } = this.app.createAnonymousContext();

    for (;;) {
      const pkgInfo = await redis.lpop(packageQueueKey);
      if (pkgInfo) {
        let job;
        try {
          job = JSON.parse(pkgInfo);
          const { appId, agentId, packagePath, timestamp, retries = 0 } = job;
          if (Date.now() - timestamp < 60 * 60 * 1000) {
            const result = await rdis.checkModuleRisk(appId, agentId, packagePath, { forceCache: true });
            if (result && result.risk) {
              const context = Object.assign({}, result.risk, result.risk.vulnerabilities);
              await alarm.judgeMetrics(appId, agentId, context, 'xtransit_notification');
              this.app.logger.info('package audit saved.');
            } else if (retries < 2) {
              await redis.rpush(packageQueueKey, JSON.stringify({ appId, agentId, packagePath, timestamp, retries: retries + 1 }));
            } else {
              this.app.logger.error('package audit failed after retries.');
            }
          }
        } catch (err) {
          this.app.logger.error(`handle package audit failed: ${err.code || 'error'}`);
          if (job && (job.retries || 0) < 2 && Date.now() - job.timestamp < 60 * 60 * 1000) {
            await redis.rpush(packageQueueKey, JSON.stringify(Object.assign({}, job, { retries: (job.retries || 0) + 1 })));
          }
        }
      }

      const left = await redis.llen(packageQueueKey);
      if (left) {
        // sleep for 1s if queue is not empty
        await new Promise(resolve => setTimeout(resolve, 1 * 1000));
      } else {
        // sleep for 10s if queue is empty
        await new Promise(resolve => setTimeout(resolve, 10 * 1000));
      }
    }
  }

  async didReady() {
    setTimeout(() => this.checkResisQueue(), 1000);
  }
}

module.exports = AppBootHook;
