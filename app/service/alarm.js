'use strict';

const boolex = require('boolex');
const contextex = require('contextex');
const moment = require('moment');
const pMap = require('p-map');
const Service = require('egg').Service;

const compliedBoolexMap = new Map();
const compliedContextexMap = new Map();

class AlarmService extends Service {
  getPath(agentId, pid, contextType) {
    let detailPath = '';
    switch (contextType) {
      case 'xprofiler_log':
        detailPath = `tab=process&agentId=${agentId}&pid=${pid}`;
        break;
      case 'system_log':
        detailPath = `tab=system&agentId=${agentId}`;
        break;
      case 'error_log':
        detailPath = `tab=error_log&agentId=${agentId}`;
        break;
      case 'xtransit_notification':
        if (!pid) {
          detailPath = `tab=module_risk&agentId=${agentId}`;
        }
        break;
      default:
        detailPath = `tab=process&agentId=${agentId}`;
        break;
    }
    return detailPath;
  }

  async debounceMessage(appId, agentId, context, strategy, message, type) {
    const { ctx: {
      app: { redis, config: { debounceFlagPrefix, debounceListPrefix, debounceWait, xprofilerConsole } },
    } } = this;
    const { id: strategyId, context: contextType } = strategy;

    const debounceValue = `${appId}::${strategyId}::${agentId}::${type}`;
    const debounceFlag = `${debounceFlagPrefix}${debounceValue}`;
    const debounceList = `${debounceListPrefix}${debounceValue}`;
    const storage = { timestamp: Date.now(), message };

    // compose message from queue
    if (await redis.setnx(debounceFlag, true)) {
      // get alarm list
      await redis.expire(debounceFlag, debounceWait);
      let list = await redis.lrange(debounceList, 0, -1);
      await redis.del(debounceList);
      list = list.map(item => JSON.parse(item));
      list.push(storage);
      list.sort((o, n) => (Number(o.timestamp) > Number(n.timestamp) ? 1 : -1));
      list.forEach(item => (item.timestamp = moment(item.timestamp).format('YYYY-MM-DD HH:mm:ss')));

      // get detail link
      const appLink = `${xprofilerConsole}/#/app/${appId}/instance?`;
      const detailLink = `${appLink}${this.getPath(agentId, context.pid, contextType)}`;

      // get peroid desc
      let periodDesc = '';
      if (list.length === 1) {
        periodDesc = `${list[0].timestamp}`;
      } else {
        periodDesc = `${list[0].timestamp} ~ ${list[list.length - 1].timestamp}`;
      }

      return { list, appLink, detailLink, periodDesc };
    }

    // push message to queue
    await redis.rpush(debounceList, JSON.stringify(storage));
    await redis.expire(debounceList, debounceWait + 30);
  }

  async prepareSend(appId, agentId, context, strategy, message, type) {
    const { ctx, ctx: { service: { mysql }, app: { redis, config: { messageLimitPrefix, messageLimit } } } } = this;
    const { id: strategyId } = strategy;

    // get contacts
    const contacts = await mysql.getContactsByStrategyId(strategyId);
    if (!contacts.length) {
      return;
    }

    // debounce message
    const result = await this.debounceMessage(appId, agentId, context, strategy, message, type);
    if (!result) {
      return;
    }

    // get message limit
    const limitCount = messageLimit[type];
    if (!limitCount) {
      ctx.logger.error(`type ${type} not configure message limit`);
      return;
    }

    // check message limit
    const today = moment().format('YYYYMMDD');
    const messageLimitKey = `${messageLimitPrefix}::${today}::${appId}::${strategyId}::${type}`;
    const sended = await redis.incr(messageLimitKey);
    if (sended > limitCount) {
      ctx.logger.error(`${messageLimitKey} exceeded (${limitCount} / ${limitCount})`);
      return;
    }

    const expired = parseInt((moment().endOf('day') - moment()) / 1000) + 60;
    await redis.expire(messageLimitKey, expired);
    return { contacts, ...result };
  }

  async judgeMetric(appId, agentId, context, strategy) {
    const { ctx, ctx: { service: { mysql, dingtalk, qywx, feishu, mailer } } } = this;
    const { id: strategyId, expression, content, push } = strategy;

    // check need alarm
    let checked = false;
    const compliedBoolex = compliedBoolexMap.get(expression);
    if (typeof compliedBoolex === 'function') {
      checked = compliedBoolex(context);
    } else {
      let checkFn;
      try {
        checkFn = boolex.compile(expression);
      } catch (err) {
        ctx.logger.error(`expression <${expression}> is illegal.`);
        checkFn = () => { };
      }
      compliedBoolexMap.set(expression, checkFn);
      checked = checkFn(context);
    }

    if (!checked) {
      return;
    }

    // get alarm message
    let message = '';
    const compliedContextex = compliedContextexMap.get(content);
    if (typeof compliedContextex === 'function') {
      message = compliedContextex(context);
    } else {
      const messageFn = contextex.compile(content);
      compliedContextexMap.set(content, messageFn);
      message = messageFn(context);
    }

    // push / save alarm message
    const tasks = [];
    switch (push) {
      case 'p1':
        tasks.push(mysql.saveAlarmLog(strategyId, agentId, message, context.pid));
        tasks.push(dingtalk.sendMessage(appId, agentId, context, strategy, message));
        tasks.push(qywx.sendMessage(appId, agentId, context, strategy, message));
        tasks.push(feishu.sendMessage(appId, agentId, context, strategy, message));
        break;
      case 'p2':
        tasks.push(mysql.saveAlarmLog(strategyId, agentId, message, context.pid));
        tasks.push(dingtalk.sendMessage(appId, agentId, context, strategy, message));
        tasks.push(qywx.sendMessage(appId, agentId, context, strategy, message));
        tasks.push(feishu.sendMessage(appId, agentId, context, strategy, message));
        break;
      case 'p3':
        tasks.push(mysql.saveAlarmLog(strategyId, agentId, message, context.pid));
        tasks.push(mailer.sendMessage(appId, agentId, context, strategy, message));
        tasks.push(dingtalk.sendMessage(appId, agentId, context, strategy, message));
        tasks.push(qywx.sendMessage(appId, agentId, context, strategy, message));
        tasks.push(feishu.sendMessage(appId, agentId, context, strategy, message));
        break;
      case 'p4':
        tasks.push(mysql.saveAlarmLog(strategyId, agentId, message, context.pid));
        // tasks.push(dingtalk.sendMessage(appId, agentId, context, strategy, message));
        // tasks.push(qywx.sendMessage(appId, agentId, context, strategy, message));
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
        await this.judgeMetric(appId, agentId, ctx, strategy);
      }, { concurrency: 2 });
    }
  }
}

module.exports = AlarmService;
