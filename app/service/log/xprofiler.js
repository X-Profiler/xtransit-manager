'use strict';

const pMap = require('p-map');
const Service = require('egg').Service;

class XprofilerService extends Service {
  async handle(appId, agentId, message) {
    const { data: { xprofiler_version, log_time, logs } } = message;
    if (!Array.isArray(logs)) {
      return;
    }

    const { ctx: { service: { mysql } } } = this;

    const logMap = logs.reduce((map, { pid, key, value }) => {
      if (map[pid]) {
        map[pid][key] = value;
      } else {
        map[pid] = { [key]: value, version: xprofiler_version, time: log_time };
      }
      return map;
    }, {});

    await pMap(Object.entries(logMap), async ([pid, log]) => {
      const tasks = [];
      tasks.push(mysql.saveXprofilerLog(appId, agentId, pid, log));
      await Promise.all(tasks);
    }, { concurrency: 2 });
  }
}

module.exports = XprofilerService;
