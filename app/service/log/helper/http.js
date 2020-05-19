'use strict';

const Service = require('egg').Service;

const STATUS_CODE_PREFIX = 'res__';

class HttpService extends Service {
  initHttpKey(list) {
    return list.reduce((init, { key }) => {
      init[key] = 0;
      return init;
    }, {});
  }

  needAvg(keys, key) {
    for (const { key: k, avg, avgKey } of keys) {
      if (key !== k || !avg) {
        continue;
      }
      return { avgKey };
    }
    return false;
  }

  getStatusMap(log, statusMap = {}) {
    // add http code
    for (const [key, value] of Object.entries(log)) {
      if (!key.startsWith(STATUS_CODE_PREFIX)) {
        continue;
      }
      const statusCode = key.replace(STATUS_CODE_PREFIX, '');
      if (statusMap[statusCode]) {
        statusMap[statusCode] += value;
      } else {
        statusMap[statusCode] = value;
      }
    }

    return statusMap;
  }

  calculateHttp(logs) {
    const keys = [
      { key: 'live_http_request', avg: false },
      { key: 'http_response_close', avg: false },
      { key: 'http_response_sent', avg: false },
      { key: 'http_request_timeout', avg: false },
      { key: 'http_rt', avg: true, avgKey: 'http_response_sent' },
    ];

    const init = this.initHttpKey(keys);

    const statusMap = {};
    let patchTimeout = 0;
    for (const [, log] of Object.entries(logs)) {
      // add log time
      init.log_time = log.time;

      // add http status
      keys.forEach(({ key }) => {
        const need = this.needAvg(keys, key);
        if (need) {
          init[key] += log[key] * log[need.avgKey];
        } else {
          init[key] += log[key];
        }
      });
      patchTimeout = log.http_patch_timeout;

      // add http code
      this.getStatusMap(log, statusMap);
    }

    Object.entries(init).forEach(([key, value]) => {
      const need = this.needAvg(keys, key);
      if (!need || !init[need.avgKey]) {
        return;
      }
      init[key] = value / init[need.avgKey];
    });

    init.patchTimeout = patchTimeout;
    init.statusMap = statusMap;

    return init;
  }
}

module.exports = HttpService;
