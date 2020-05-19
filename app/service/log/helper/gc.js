'use strict';

const Service = require('egg').Service;

class GcService extends Service {
  initGcAvgKey(list) {
    return list.reduce((init, key) => {
      init[key] = 0;
      return init;
    }, {});
  }

  calculateGcAvg(logs) {
    const keys = [
      'total_gc_times',
      'total_gc_duration',
      'total_scavange_duration',
      'total_marksweep_duration',
      'total_incremental_marking_duration',
      'gc_time_during_last_record',
      'scavange_duration_last_record',
      'marksweep_duration_last_record',
      'incremental_marking_duration_last_record',
    ];

    const init = this.initGcAvgKey(keys);

    let processCount = 0;
    for (const [, log] of Object.entries(logs)) {
      processCount++;
      keys.forEach(key => {
        init[key] += log[key];
      });
    }

    if (processCount !== 0) {
      Object.entries(init).forEach(([key, value]) => (init[key] = value / processCount));
    }

    return init;
  }
}

module.exports = GcService;
