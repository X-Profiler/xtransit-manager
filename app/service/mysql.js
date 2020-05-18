'use strict';

const Service = require('egg').Service;

class MysqlService extends Service {
  consoleQuery(sql, params) {
    const { ctx: { app: { mysql } } } = this;
    const xprofiler_console = mysql.get('xprofiler_console');
    return xprofiler_console.query(sql, params);
  }

  logsQuery(sql, params) {
    const { ctx: { app: { mysql } } } = this;
    const xprofiler_logs = mysql.get('xprofiler_logs');
    return xprofiler_logs.query(sql, params);
  }

  getAppByAppId(appId) {
    const sql = 'SELECT * FROM apps WHERE id = ?';
    const params = [appId];
    return this.consoleQuery(sql, params).then(data => data[0] || {});
  }
}

module.exports = MysqlService;
