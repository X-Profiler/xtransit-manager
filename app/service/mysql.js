'use strict';

const moment = require('moment');
const pMap = require('p-map');
const Service = require('egg').Service;

const XPROFILER_KEY = [
  // cpu
  'cpu_now', 'cpu_15', 'cpu_30', 'cpu_60',

  // memory overview
  'rss', 'heap_used', 'heap_available', 'heap_total', 'heap_limit', 'heap_executeable', 'total_physical_size', 'malloced_memory', 'amount_of_external_allocated_memory',
  // new space
  'new_space_size', 'new_space_used', 'new_space_available', 'new_space_committed',
  // old space
  'old_space_size', 'old_space_used', 'old_space_available', 'old_space_committed',
  // code space
  'code_space_size', 'code_space_used', 'code_space_available', 'code_space_committed',
  // map space
  'map_space_size', 'map_space_used', 'map_space_available', 'map_space_committed',
  // large object space
  'lo_space_size', 'lo_space_used', 'lo_space_available', 'lo_space_committed',
  // read only space
  'read_only_space_size', 'read_only_space_used', 'read_only_space_available', 'read_only_space_committed',
  // new large object space
  'new_lo_space_size', 'new_lo_space_used', 'new_lo_space_available', 'new_lo_space_committed',
  // code large objece space
  'code_lo_space_size', 'code_lo_space_used', 'code_lo_space_available', 'code_lo_space_committed',

  // gc total
  'uptime', 'total_gc_times', 'total_gc_duration', 'total_scavange_duration', 'total_marksweep_duration', 'total_incremental_marking_duration',
  // gc last time
  'gc_time_during_last_record', 'scavange_duration_last_record', 'marksweep_duration_last_record', 'incremental_marking_duration_last_record',

  // uv
  'active_handles',
  // file handles
  'active_file_handles', 'active_and_ref_file_handles',
  // tcp handles
  'active_tcp_handles', 'active_and_ref_tcp_handles',
  // udp handles
  'active_udp_handles', 'active_and_ref_udp_handles',
  // timer handles
  'active_timer_handles', 'active_and_ref_timer_handles',

  // http
  'live_http_request', 'http_response_close', 'http_response_sent', 'http_request_timeout', 'http_patch_timeout', 'http_rt',
];

const SYSTEM_KEY = [
  // system
  'uptime',

  // cpu
  'used_cpu', 'cpu_count',

  // memory
  // 'total_memory', 'free_memory',

  // load
  'load1', 'load5', 'load15',

  // disks
  // 'disks',

  // process
  'node_count',

  // gc total
  'total_gc_times', 'total_gc_duration', 'total_scavange_duration', 'total_marksweep_duration', 'total_incremental_marking_duration',
  // gc last time
  'gc_time_during_last_record', 'scavange_duration_last_record', 'marksweep_duration_last_record', 'incremental_marking_duration_last_record',

  // http
  // 'response_codes',
  'live_http_request', 'http_response_close', 'http_response_sent', 'http_request_timeout', 'http_patch_timeout', 'http_rt',
];

class MysqlService extends Service {
  consoleQuery(sql, params = []) {
    const { ctx: { app: { mysql } } } = this;
    const xprofiler_console = mysql.get('xprofiler_console');
    return xprofiler_console.query(sql, params);
  }

  logsQuery(sql, params = []) {
    const { ctx: { app: { mysql } } } = this;
    const xprofiler_logs = mysql.get('xprofiler_logs');
    return xprofiler_logs.query(sql, params);
  }

  /* table <apps> */
  getAppByAppId(appId) {
    const sql = 'SELECT * FROM apps WHERE id = ?';
    const params = [appId];
    return this.consoleQuery(sql, params).then(data => data[0] || {});
  }

  /* table <files> */
  updateFileStatusByAppAgentFile(appId, agentId, filePath) {
    const sql = 'UPDATE files SET status = ? WHERE app = ? AND agent = ? AND file = ? AND status = ?';
    const params = [1, appId, agentId, filePath, 0];
    return this.consoleQuery(sql, params);
  }

  /* table <coredumps> */
  addCoreFile(appId, agentId, corePath, executableInfo) {
    const systemUser = 999999;
    const sql = 'INSERT INTO coredumps (app, agent, file, node, user, file_status, file_storage, node_status, node_storage) '
      + 'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
    const params = [appId, agentId, corePath, executableInfo, systemUser, 1, '', 1, ''];
    return this.consoleQuery(sql, params);
  }

  /* table strategies */
  getStrategiesByAppIdAndContextType(appId, contextType) {
    const sql = 'SELECT * FROM strategies WHERE app = ? AND context = ? AND status = 1';
    const params = [appId, contextType];
    return this.consoleQuery(sql, params);
  }

  /* table  <contacts> */
  getContactsByStrategyId(strategyId) {
    const sql = 'SELECT * FROM contacts WHERE strategy = ?';
    const params = [strategyId];
    return this.consoleQuery(sql, params);
  }

  /* table <user> */
  getUserByUserIds(userIds) {
    if (!userIds.length) {
      return [];
    }
    const sql = `SELECT * FROM user WHERE id in (${userIds.map(() => '?').join(',')})`;
    const params = [...userIds];
    return this.consoleQuery(sql, params);
  }

  /* save table ${log_table}_${DD} */
  getTable(tablePrefix, logTime) {
    return `${tablePrefix}${moment(logTime).format('DD')}`;
  }

  checkLog(checkList, log, appId, agentId, outputError = true) {
    const { ctx } = this;
    for (const requiredKey of checkList) {
      if (log[requiredKey] || log[requiredKey] === 0 || Math.abs(log[requiredKey]) < Math.pow(2, 32)) {
        continue;
      }
      if (outputError) {
        ctx.logger.error(`app: ${appId} agent: ${agentId} don't have required key: ${requiredKey}, raw log: ${JSON.stringify(log)}`);
      }
      // adjust for sql
      log[requiredKey] = 0;
    }
  }

  saveXprofilerLog(appId, agentId, pid, log) {
    this.checkLog(XPROFILER_KEY, log, appId, agentId);
    const { time, version, statusMap } = log;
    const table = this.getTable('process_', time);
    const sql =
      `INSERT INTO ${table} (`
      + 'app, agent, pid, log_time, version'
      + `, ${XPROFILER_KEY.join(', ')}, `
      + 'response_codes) '
      + 'values ('
      + '?, ?, ?, ?, ?'
      + `, ${XPROFILER_KEY.map(() => '?').join(', ')}, `
      + '?)';

    const params = [appId, agentId, pid, time, version];
    for (const key of XPROFILER_KEY) {
      params.push(log[key]);
    }
    params.push(JSON.stringify(statusMap) || '{}');

    return this.logsQuery(sql, params);
  }

  saveSystemLog(appId, agentId, log, position) {
    this.checkLog(SYSTEM_KEY, log, appId, agentId, false);
    const { log_time, version, total_memory, free_memory, disks, statusMap } = log;
    const table = this.getTable('osinfo_', log_time);
    const sql =
      `INSERT INTO ${table} (`
      + 'app, agent, log_time, position, version, total_memory, free_memory, disks, response_codes'
      + `,  ${SYSTEM_KEY.join(', ')}) `
      + 'values ('
      + '?, ?, ?, ?, ?, ?, ?, ?, ?'
      + `, ${SYSTEM_KEY.map(() => '?').join(', ')})`;

    const params = [appId, agentId, log_time, position, version || '', total_memory || 0, free_memory || 0,
      JSON.stringify(disks) || '{}', JSON.stringify(statusMap) || '{}'];
    for (const key of SYSTEM_KEY) {
      params.push(log[key]);
    }

    return this.logsQuery(sql, params);
  }

  saveAlarmLog(strategyId, agentId, message, pid = null) {
    message = message.length > 250 ? message.slice(0, 245) + '...' : message;
    const table = this.getTable('alarm_', Date.now());
    const sql = `INSERT INTO ${table} (strategy, agent, message, pid) `
      + 'VALUES (?, ?, ?, ?)';
    const params = [strategyId, agentId, message, pid];
    return this.logsQuery(sql, params);
  }

  /* clean table ${log_table}_${DD} */
  getTableTotalLines(table, key) {
    const sql = `SELECT COUNT(?) as count FROM ${table}`;
    const params = [key];
    return this.logsQuery(sql, params).then(data => data[0] || { count: 0 });
  }

  async cleanTable(table) {
    const { app, app: { config: { mysqlOnceCleanLine } } } = this;
    const prefix = 'xtransit-manager-mysql';
    const logger = app.getLogger('scheduleLogger');
    let { count } = await this.getTableTotalLines(table, 'id');
    logger.info(`[${prefix}] start cleaning table ${table}: ${count}.`);
    const start = Date.now();
    while (count > 0) {
      logger.info(`[${prefix}] clean ${table} left ${count}.`);
      await this.logsQuery(`DELETE FROM ${table} LIMIT ${mysqlOnceCleanLine}`);
      await this.logsQuery(`OPTIMIZE TABLE ${table}`);
      count -= mysqlOnceCleanLine;
    }
    logger.info(`[${prefix}] clean table ${table} succeed, cost ${Date.now() - start}ms.`);
  }

  async cleanHistory(prefix, expired) {
    const remains = [];
    const now = Date.now();
    for (let i = 0; i < expired; i++) {
      remains.push(`${prefix}${moment(now - i * 24 * 3600 * 1000).format('DD')}`);
    }

    const tables = new Array(31)
      .fill('')
      .map((...args) => `${prefix}${(args[1] + 1) < 10 ? `0${(args[1] + 1)}` : (args[1] + 1)}`);
    await pMap(tables, async table => {
      if (remains.includes(table)) {
        return;
      }
      await this.cleanTable(table);
    }, { concurrency: 1 });
  }

  async cleanProcessHistory() {
    const { ctx: { app: { config } } } = this;
    await this.cleanHistory('process_', config.processHistoryStorage);
  }

  async cleanOsHistory() {
    const { ctx: { app: { config } } } = this;
    await this.cleanHistory('osinfo_', config.processHistoryStorage);
  }

  async cleanAlarmHistory() {
    const { ctx: { app: { config } } } = this;
    await this.cleanHistory('alarm_', config.processHistoryStorage);
  }
}

module.exports = MysqlService;
