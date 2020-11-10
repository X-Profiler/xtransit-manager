'use strict';

const pMap = require('p-map');
const Service = require('egg').Service;

class XprofilerService extends Service {
  async handle(appId, agentId, message) {
    this.ctx.app.formatLogTime(message);

    const { xprofiler_version, log_time, logs } = message;
    if (!Array.isArray(logs) || !logs.length) {
      return;
    }

    const { ctx: { service: { mysql, alarm, log: { system, helper: { gc, http } } } } } = this;

    const logMap = logs.reduce((map, { pid, key, value }) => {
      if (map[pid]) {
        map[pid][key] = value;
      } else {
        map[pid] = { [key]: value, version: xprofiler_version, time: log_time };
      }
      return map;
    }, {});

    const gcAvg = gc.calculateGcAvg(logMap);
    const httpInfo = http.calculateHttp(logMap);
    await system.handle(appId, agentId, { ...gcAvg, ...httpInfo }, 1);

    await pMap(Object.entries(logMap), async ([pid, log]) => {
      const tasks = [];
      log.statusMap = http.getStatusMap(log);
      tasks.push(mysql.saveXprofilerLog(appId, agentId, pid, log));

      // check rule
      const context = Object.assign({
        pid,
        gc_60: Number((log.gc_time_during_last_record / (60 * 1000) * 100).toFixed(2)),
      }, log);
      tasks.push(alarm.judgeMetrics(appId, agentId, context, 'xprofiler_log'));
      await Promise.all(tasks);
    }, { concurrency: 2 });
  }
}

module.exports = XprofilerService;
