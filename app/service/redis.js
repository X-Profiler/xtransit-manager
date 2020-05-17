'use strict';

const pMap = require('p-map');
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

  async cleanExpiredXtransit() {
    const { ctx: { app: { redis, config: { appsKey } } } } = this;
    const livingApps = await redis.smembers(appsKey);
    await pMap(livingApps, async appId => {
      const key = this.composeClientsKey(appId);

      // clean expired agents
      const agentIds = await redis.hgetall(key);
      let length = 0;
      await pMap(Object.entries(agentIds), async ([agentId, agentInfo]) => {
        length++;
        const { timestamp } = JSON.parse(agentInfo);
        if (!timestamp || Date.now() - timestamp > 5 * 60 * 1000) {
          const field = this.composeClientsField(agentId);
          await redis.hdel(key, field);
          length--;
        }
      }, { concurrency: 2 });

      // check app is still living
      if (length === 0) {
        await redis.srem(appsKey, appId);
      }
    }, { concurrency: 2 });
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

  async updateLivingApp(appId) {
    const { ctx: { app: { redis, config: { appsKey } } } } = this;
    await redis.sadd(appsKey, appId);
  }

  async updateClient(appId, agentId, clientId, server, timestamp) {
    const { ctx: { app: { redis } } } = this;
    // handle old client
    await this.handleOldClients(appId, agentId, clientId);

    // add living app info
    await this.updateLivingApp(appId);

    // add client info
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
      const tasks = [];
      tasks.push(redis.hdel(key, field));
      await Promise.all(tasks);
    }
  }

  async getClient(appId, agentId) {
    const { ctx, ctx: { app: { redis } } } = this;
    const key = this.composeClientsKey(appId);
    const field = this.composeClientsField(agentId);
    let value = await redis.hget(key, field);
    try {
      value = JSON.parse(value);
    } catch (err) {
      ctx.logger.error(`[redis] [removeClient] falied: ${err}`);
    }
    return value || {};
  }

  async getClients(appId) {
    const { ctx: { app: { redis }, service: { xtransit } } } = this;
    const key = this.composeClientsKey(appId);
    const agents = await redis.hgetall(key);
    if (Object.keys(agents).length === 0) {
      return;
    }
    const map = {};
    for (const [agentId, agentInfo] of Object.entries(agents)) {
      const { server, clientId } = JSON.parse(agentInfo);
      const data = { appId, agentId, clientId };
      if (map[server]) {
        map[server].push(data);
      } else {
        map[server] = [data];
      }
    }
    const livingClients = [];
    await pMap(Object.entries(map), async ([server, clients]) => {
      const data = await xtransit.checkClientAlive(server, { clients });
      for (const [index, status] of Object.entries(data)) {
        const clientInfo = clients[Number(index)];
        if (status) {
          livingClients.push(clientInfo);
        } else {
          const { agentId } = clientInfo;
          const field = this.composeClientsField(agentId);
          await redis.hdel(key, field);
        }
      }
    }, { concurrency: 2 });

    return livingClients;
  }
}

module.exports = RedisService;
