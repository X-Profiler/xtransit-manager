'use strict';

const path = require('path');

/** @type Egg.EggPlugin */
module.exports = {
  // had enabled by egg
  mysql: {
    enable: true,
    package: 'egg-mysql',
  },

  redis: {
    enable: true,
    package: 'egg-redis',
  },

  ejs: {
    enable: true,
    package: 'egg-view-ejs',
  },

  remoteConfig: {
    enable: true,
    package: 'egg-remote-config',
  },

  // xprofiler plugin
  xmailer: {
    enable: true,
    path: path.join(__dirname, '../lib/plugin/egg-xprofiler-mailer'),
  },

  xdingtalk: {
    enable: true,
    path: path.join(__dirname, '../lib/plugin/egg-xprofiler-dingtalk'),
  },

  xqywx: {
    enable: true,
    path: path.join(__dirname, '../lib/plugin/egg-xprofiler-qywx'),
  },
  
  xfeishu: {
    enable: true,
    path: path.join(__dirname, '../lib/plugin/egg-xprofiler-feishu'),
  },
};
