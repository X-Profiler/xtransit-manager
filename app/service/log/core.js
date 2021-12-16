'use strict';

const pMap = require('p-map');
const Service = require('egg').Service;

class CoreService extends Service {
  async handle(appId, agentId, message) {
    const { ctx: { service: { mysql, alarm } } } = this;

    const { list = [] } = message;

    await pMap(list, async ({ core_path, executable_path, node_version, alinode_version }) => {
      const executableInfo = { executable_path };
      executableInfo.alinode = !!alinode_version;
      executableInfo.version = alinode_version ? alinode_version : node_version;
      await mysql.addCoreFile(appId, agentId, core_path, JSON.stringify(executableInfo));
    }, { concurrency: 10 });

    // alarm core info
    const context = {
      core_count: list.length,
      core_files: `${list.map(core => core.core_path).join(', ')}`,
    };
    await alarm.judgeMetrics(appId, agentId, context, 'xtransit_notification');
  }
}

module.exports = CoreService;
