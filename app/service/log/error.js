'use strict';

const Service = require('egg').Service;

class ErrorService extends Service {
  async handle(appId, agentId, message) {
    const { ctx: { service: { redis } } } = this;

    for (const [errorLogFile, errorLogs] of Object.entries(message)) {
      const tasks = [];
      tasks.push(redis.updateLogs(appId, agentId, errorLogFile, 'error'));
      if (Array.isArray(errorLogs) && errorLogs.length) {
        tasks.push(redis.saveErrorLogs(errorLogFile, errorLogs));
      }
      await Promise.all(tasks);
    }
  }
}

module.exports = ErrorService;
