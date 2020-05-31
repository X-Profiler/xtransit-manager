'use strict';

const Service = require('egg').Service;

class AlarmService extends Service {
  async judgeMetrics(appId, agentId, context, contextType) {
    const { ctx: { service: { mysql } } } = this;
    const strategies = await mysql.getStrategiesByAppIdAndContextType(appId, contextType);
    strategies.map(strategy => console.log('-------->', contextType, strategy.expression));
    console.log('\n\n');
  }
}

module.exports = AlarmService;
