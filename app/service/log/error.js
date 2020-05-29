'use strict';

const Service = require('egg').Service;

class ErrorService extends Service {
  async handle(appId, agentId, message) {
    console.log(12333, appId, agentId, message);
  }
}

module.exports = ErrorService;
