'use strict';

const boolex = require('boolex');
const contextex = require('contextex');
const pMap = require('p-map');
const Service = require('egg').Service;

const compliedBoolexMap = new Map();
const compliedContextexMap = new Map();

class AlarmService extends Service {
  async judgeMetric(appId, agentId, context, contextType, strategy) {
    const { ctx: { service: { mysql } } } = this;
    const { id: strategyId, expression, content, push } = strategy;

    // check need alarm
    let checked = false;
    const compliedBoolex = compliedBoolexMap.get(expression);
    if (typeof compliedBoolex === 'function') {
      checked = compliedBoolex(context);
    } else {
      const checkFn = boolex.compile(expression);
      compliedBoolexMap.set(expression, checkFn);
      checked = checkFn(context);
    }

    if (!checked) {
      return;
    }

    // record alarm message
    let message = '';
    const compliedContextex = compliedContextexMap.get(content);
    if (typeof compliedContextex === 'function') {
      message = compliedContextex(context);
    } else {
      const messageFn = contextex.compile(content);
      compliedContextexMap.set(content, messageFn);
      message = messageFn(context);
    }

    const tasks = [];
    switch (push) {
      case 'p1':
        tasks.push(mysql.saveAlarmLog(strategyId, agentId, message, context.pid));
        break;
      case 'p2':
        tasks.push(mysql.saveAlarmLog(strategyId, agentId, message, context.pid));
        break;
      case 'p3':
        tasks.push(mysql.saveAlarmLog(strategyId, agentId, message, context.pid));
        break;
      case 'p4':
        tasks.push(mysql.saveAlarmLog(strategyId, agentId, message, context.pid));
        break;
      default:
        break;
    }

    await Promise.all(tasks);
  }

  async judgeMetrics(appId, agentId, context, contextType) {
    const { ctx: { service: { mysql } } } = this;
    const strategies = await mysql.getStrategiesByAppIdAndContextType(appId, contextType);
    for (const strategy of strategies) {
      const judgeContext = Array.isArray(context) ? context : [context];
      await pMap(judgeContext, async ctx => {
        await this.judgeMetric(appId, agentId, ctx, contextType, strategy);
      }, { concurrency: 2 });
    }
  }
}

module.exports = AlarmService;
