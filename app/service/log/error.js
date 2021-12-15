'use strict';

const Service = require('egg').Service;

class ErrorService extends Service {
  async handle(appId, agentId, message) {
    const { ctx: { service: { redis, alarm } } } = this;

    for (const [errorLogFile, errorLogs] of Object.entries(message)) {
      const tasks = [];
      tasks.push(redis.updateLogs(appId, agentId, errorLogFile, 'error'));
      if (Array.isArray(errorLogs) && errorLogs.length) {
        tasks.push(redis.saveErrorLogs(appId, agentId, errorLogFile, errorLogs));
        const context = errorLogs.map(log => {
          return Object.assign({
            agent: agentId,
            error_type: log.type,
            log_path: errorLogFile,
          }, log);
        });
        tasks.push(alarm.judgeMetrics(appId, agentId, context, 'error_log'));
      }
      await Promise.all(tasks);
    }
  }
}

module.exports = ErrorService;
