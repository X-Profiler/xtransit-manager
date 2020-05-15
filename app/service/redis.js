'use strict';

const Service = require('egg').Service;

class RedisService extends Service {
  async updateClient(appId, agentId, clientId, server, timestamp) {
    const { ctx: { app: { config: { clientListPrefix }, redis } } } = this;
    const key = `${clientListPrefix}${appId}`;
    const field = agentId;
    const value = JSON.stringify({ clientId, server, timestamp });
    await redis.hset(key, field, value);
  }
}

module.exports = RedisService;
