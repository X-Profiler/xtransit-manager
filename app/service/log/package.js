'use strict';

const Service = require('egg').Service;

class PackageService extends Service {
  async handle(appId, agentId, message) {
    const { ctx: { service: { redis } } } = this;

    // check pkgs
    const { pkgs } = message;
    if (!Array.isArray(pkgs) || !pkgs.length) {
      return;
    }

    // save pkgs
    for (const { name, pkg, lock, lockType, lockImporter } of pkgs) {
      const tasks = [];
      tasks.push(redis.updateLogs(appId, agentId, name, 'package'));
      tasks.push(redis.savePackage(appId, agentId, name, pkg, lock, lockType, lockImporter));
      await Promise.all(tasks);
    }
  }
}

module.exports = PackageService;
