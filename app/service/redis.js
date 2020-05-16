'use strict';

const Service = require('egg').Service;

class RedisService extends Service {
  composeClientsKey(appId) {
    const { ctx: { app: { config: { clientsPrefix } } } } = this;
    const key = `${clientsPrefix}${appId}`;
    return key;
  }

  composeClientsField(agentId) {
    return agentId;
  }

  async handleOldClients(appId, agentId, clientId) {
    const { ctx, ctx: { app: { redis }, service: { xtransit } } } = this;
    try {
      const key = this.composeClientsKey(appId);
      const field = this.composeClientsField(agentId);

      // check old client
      let oldClients = await redis.hget(key, field);
      oldClients = JSON.parse(oldClients);

      if (oldClients) {
        const { clientId: oldClientId, server: oldClientServer } = oldClients;
        if (oldClientId !== clientId) {
          await xtransit.closeClient(oldClientServer, { appId, agentId, oldClientId });
        }
      }
    } catch (err) {
      ctx.logger.error(`[redis] [handleOldClients] falied: ${err}`);
    }
  }

  async updateClient(appId, agentId, clientId, server, timestamp) {
    const { ctx: { app: { redis } } } = this;
    await this.handleOldClients(appId, agentId, clientId);
    const key = this.composeClientsKey(appId);
    const field = this.composeClientsField(agentId);
    const value = JSON.stringify({ clientId, server, timestamp });
    await redis.hset(key, field, value);
  }

  async removeClient(appId, agentId, clientId) {
    const { ctx, ctx: { app: { redis } } } = this;
    const key = this.composeClientsKey(appId);
    const field = this.composeClientsField(agentId);
    let value = await redis.hget(key, field);
    try {
      value = JSON.parse(value);
    } catch (err) {
      ctx.logger.error(`[redis] [removeClient] falied: ${err}`);
      return;
    }
    if (value.clientId === clientId) {
      await redis.hdel(key, field);
    }
  }
}

module.exports = RedisService;
