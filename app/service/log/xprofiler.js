'use strict';

const Service = require('egg').Service;

class XprofilerService extends Service {
  async handle(appId, agentId, message) {
    const { data: { xprofiler_version, log_time, logs } } = message;
    if (!Array.isArray(logs)) {
      return;
    }
    const logMap = logs.reduce((map, { pid, key, value }) => {
      if (map[pid]) {
        map[pid][key] = value;
      } else {
        map[pid] = { [key]: value, version: xprofiler_version, time: log_time };
      }
      return map;
    }, {});

    console.log(12333, appId, agentId, logMap);
  }
}

module.exports = XprofilerService;
