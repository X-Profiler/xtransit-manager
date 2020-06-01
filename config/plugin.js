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

  // xprofiler plugin
  xdingtalk: {
    enable: true,
    path: path.join(__dirname, '../lib/plugin/egg-xprofiler-dingtalk'),
  },

  xmailer: {
    enable: true,
    path: path.join(__dirname, '../lib/plugin/egg-xprofiler-mailer'),
  },
};
