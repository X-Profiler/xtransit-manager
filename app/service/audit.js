'use strict';

const regFetch = require('npm-registry-fetch');
const pnpm = require('./pnpm-audit');
const Service = require('egg').Service;

class AuditService extends Service {
  constructor(ctx) {
    super(ctx);
    this.registryFetch = regFetch;
  }

  async getPnpmAudit(lock, lockImporter) {
    const { ctx: { app: { config: { npmRegistry } } } } = this;
    try {
      const graph = pnpm.parsePnpmLock(lock, lockImporter || '.');
      const names = {};
      for (const node of graph.nodes) {
        if (!names[node.name]) names[node.name] = [];
        if (!names[node.name].includes(node.version)) names[node.name].push(node.version);
      }
      const opts = {
        method: 'POST',
        gzip: true,
        body: names,
      };
      const response = await (await this.registryFetch(`${npmRegistry}/-/npm/v1/security/advisories/bulk`, opts)).json();
      return pnpm.auditPnpm(graph, response);
    } catch (err) {
      this.ctx.logger.error(`getPnpmAudit failed: ${err.code || 'error'}`);
    }
  }

  async getAudit(pkg, lock, lockType, lockImporter) {
    if (lockType === 'pnpm') return this.getPnpmAudit(lock, lockImporter);
    const { ctx, ctx: { app: { config: { npmRegistry } } } } = this;
    try {
      const { dependencies, devDependencies } = pkg;
      const auditData = lock;
      auditData.requires = Object.assign({}, dependencies, devDependencies);
      const opts = {
        color: true,
        json: true,
        unicode: true,
        method: 'POST',
        gzip: true,
        body: auditData,
      };
      const response = await (await this.registryFetch(`${npmRegistry}/-/npm/v1/security/audits`, opts)).json();
      return response;
    } catch (err) {
      ctx.logger.error(`getAudit failed: ${err}`);
    }
  }

  getRiskModules(audit) {
    const { actions, advisories } = audit;
    const riskModules = {};
    for (const { action, resolves, module: mod, depth, target } of actions) {
      let cmd = '';
      switch (action) {
        case 'install':
          cmd = `npm install ${mod}@${target}`;
          break;
        case 'update':
          cmd = `npm update ${mod}@${target} --depth=${depth}`;
          break;
        case 'review':
          cmd = '涉及到的安全风险问题需要手动 review 处理';
          break;
        default:
          break;
      }

      for (const { id, path, dev } of resolves) {
        const topMod = path.split('>')[0];
        if (cmd === 'install') {
          cmd = `${cmd} ${dev ? '--save-dev' : '--save'}`;
        }
        const { vulnerable_versions, url, severity, findings } = advisories[id];
        const tmp = {
          name: mod, path, dev, cmd, vulnerable_versions, url, severity,
          currentVersions: findings.map(({ version }) => version).join(', '),
        };
        if (riskModules[topMod]) {
          riskModules[topMod].push(tmp);
        } else {
          riskModules[topMod] = [tmp];
        }
      }
    }

    return riskModules;
  }
}

module.exports = AuditService;
