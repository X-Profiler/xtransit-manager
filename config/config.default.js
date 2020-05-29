/* eslint valid-jsdoc: "off" */

'use strict';

/**
 * @param {Egg.EggAppInfo} appInfo app info
 */
module.exports = appInfo => {
  /**
   * built-in config
   * @type {Egg.EggAppConfig}
   **/
  const config = exports = {};

  config.keys = appInfo.name + '_1589386223046_7287';

  config.middleware = [];

  config.security = {
    csrf: {
      ignore: [
        '/xtransit',
        '/xprofiler',
      ],
    },
  };

  config.secure = {
    secret: 'easy-monitor::xprofiler',
  };

  config.httpTimeout = 15000;

  config.appsKey = 'XTRANSIT_APP';

  config.clientsPrefix = 'XTRANSIT_CLIENT::';

  config.logsKey = 'XTRANSIT_LOG';

  config.logsPrefix = 'XTRANSIT_LOG_FILE::';

  config.errorLogPrefix = 'XTRANSIT_ERROR_LOG::';

  config.errorLogLimit = 5000;

  config.errorLogStorage = 7;

  config.packagePrefix = 'XTRANSIT_PKG_LOG::';

  config.packageStorage = 7;

  config.processHistoryStorage = 7;

  const userConfig = {};

  // mysql
  userConfig.mysql = {
    app: true,
    agent: false,
    clients: {
      xprofiler_console: {
        host: '',
        port: 3306,
        user: '',
        password: '',
        database: 'xprofiler_console',
      },
      xprofiler_logs: {
        host: '',
        port: 3306,
        user: '',
        password: '',
        database: 'xprofiler_logs',
      },
    },
  };

  // redis
  userConfig.redis = {
    client: {
      sentinels: null,
      port: 6379,
      host: '',
      password: '',
      db: 0,
    },
  };

  return {
    ...config,
    ...userConfig,
  };
};
