'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const AuditService = require('../app/service/audit');
const RedisService = require('../app/service/redis');
const pnpm = require('../app/service/pnpm-audit');

const fixture = name => fs.readFileSync(path.join(__dirname, name), 'utf8');
const lodashAdvisory = {
  id: 123,
  vulnerable_versions: '<4.17.21',
  severity: 'high',
  url: 'https://github.com/advisories/GHSA-35jh-r3h4-6jhm',
};

for (const name of [ 'pnpm-v8-lock.yaml', 'pnpm-v9-lock.yaml' ]) {
  const graph = pnpm.parsePnpmLock(fixture(name));
  assert.ok(graph.nodes.some(node => node.name === 'lodash' && node.version === '4.17.20' && node.path.indexOf('wrapper > lodash') === 0), `${name} keeps indirect lodash`);
  const audit = pnpm.auditPnpm(graph, { lodash: [ lodashAdvisory ] });
  assert.ok(audit.metadata.vulnerabilities.high === 1, `${name} reports one advisory`);
  assert.ok(audit.metadata.vulnerabilities.total === 1, `${name} does not duplicate same version advisory`);
  assert.ok(audit.metadata.totalDependencies >= 1, `${name} reports scanned package count`);
  assert.ok(audit.riskModules.wrapper.some(module => module.name === 'lodash' && module.currentVersions === '4.17.20'));
  assert.ok(Object.values(audit.riskModules).reduce((all, modules) => all.concat(modules), []).every(module => module.cmd.indexOf('pnpm ') === 0));
}

const peerLock = `
lockfileVersion: '9.0'
importers:
  .:
    dependencies:
      '@scope/peer-wrapper':
        specifier: ^1.0.0
        version: '@scope/peer-wrapper@1.0.0(lodash@4.17.20)'
packages:
  '@scope/peer-wrapper@1.0.0(lodash@4.17.20)':
    resolution: {integrity: test}
  lodash@4.17.20:
    resolution: {integrity: test}
snapshots:
  '@scope/peer-wrapper@1.0.0(lodash@4.17.20)':
    dependencies:
      lodash: 4.17.20
  lodash@4.17.20: {}
`;
const peerGraph = pnpm.parsePnpmLock(peerLock);
assert.ok(peerGraph.nodes.some(node => node.name === '@scope/peer-wrapper' && node.version === '1.0.0'));
assert.ok(peerGraph.nodes.some(node => node.name === 'lodash' && node.version === '4.17.20'));

const aliasedTransitiveLock = `
lockfileVersion: '9.0'
importers:
  .:
    dependencies:
      wrapper: {specifier: ^1.0.0, version: '1.0.0(lodash@4.17.20)'}
packages:
  wrapper@1.0.0: {resolution: {integrity: test}}
  lodash@4.17.20: {resolution: {integrity: test}}
  '@scope/actual@2.0.0': {resolution: {integrity: test}}
snapshots:
  wrapper@1.0.0(lodash@4.17.20):
    dependencies:
      aliased: '@scope/actual@2.0.0'
      lodash: 4.17.20
  lodash@4.17.20: {}
  '@scope/actual@2.0.0': {}
`;
const aliasedGraph = pnpm.parsePnpmLock(aliasedTransitiveLock);
assert.ok(aliasedGraph.nodes.some(node => node.name === '@scope/actual' && node.version === '2.0.0'));
assert.ok(aliasedGraph.nodes.length < 10);

const workspaceLock = `
lockfileVersion: '9.0'
importers:
  .:
    dependencies:
      app: {specifier: workspace:*, version: link:apps/app}
  apps/app:
    dependencies:
      lodash: {specifier: 4.17.20, version: 4.17.20}
packages:
  lodash@4.17.20: {resolution: {integrity: test}}
snapshots:
  lodash@4.17.20: {}
`;
const workspaceGraph = pnpm.parsePnpmLock(workspaceLock, '.');
assert.ok(workspaceGraph.nodes.some(node => node.name === 'lodash' && node.version === '4.17.20'));

const unknownLock = `
lockfileVersion: '9.0'
importers:
  .:
    dependencies:
      missing: {specifier: ^1.0.0, version: 1.0.0}
packages: {}
snapshots: {}
`;
assert.throws(() => pnpm.parsePnpmLock(unknownLock), error => error.code === 'PNPM_AUDIT_INCOMPLETE');
assert.throws(() => pnpm.parsePnpmLock("lockfileVersion: '10.0'\nimporters: {'.': {}}"), error => error.code === 'PNPM_AUDIT_INCOMPLETE');
assert.strictEqual(pnpm.advisoryMatches(lodashAdvisory, '4.17.20'), true);
assert.strictEqual(pnpm.advisoryMatches(lodashAdvisory, '4.17.21'), false);
assert.throws(() => pnpm.advisoryMatches({ vulnerable_versions: 'not-a-range' }, '4.17.20'), error => error.code === 'PNPM_AUDIT_INCOMPLETE');

async function run() {
  const auditService = Object.create(AuditService.prototype);
  auditService.ctx = { app: { config: { npmRegistry: 'https://registry.test' } }, logger: { error() {} } };
  let request;
  auditService.registryFetch = async (url, options) => {
    request = { url, options };
    return { json: async () => ({ lodash: [ lodashAdvisory ] }) };
  };
  const serviceAudit = await auditService.getPnpmAudit(fixture('pnpm-v9-lock.yaml'), '.');
  assert.strictEqual(request.url, 'https://registry.test/-/npm/v1/security/advisories/bulk');
  assert.deepStrictEqual(request.options.body, { lodash: [ '4.17.20' ] });
  assert.strictEqual(serviceAudit.metadata.vulnerabilities.total, 1);

  let errorLogged = false;
  const errorService = Object.create(AuditService.prototype);
  errorService.ctx = { app: { config: { npmRegistry: 'https://registry.test' } }, logger: { error() { errorLogged = true; } } };
  errorService.registryFetch = async () => { throw new Error('registry unavailable'); };
  assert.strictEqual(await errorService.getPnpmAudit(fixture('pnpm-v9-lock.yaml'), '.'), undefined);
  assert.strictEqual(errorLogged, true);

  const npmService = Object.create(AuditService.prototype);
  npmService.ctx = { app: { config: { npmRegistry: 'https://registry.test' } }, logger: { error() {} } };
  let npmRequest;
  npmService.registryFetch = async (url, options) => {
    npmRequest = { url, options };
    return { json: async () => ({ metadata: {}, actions: [], advisories: {} }) };
  };
  const npmResult = await npmService.getAudit({ dependencies: { lodash: '^4.17.20' }, devDependencies: {} }, { dependencies: {} });
  assert.deepStrictEqual(npmResult.actions, []);
  assert.strictEqual(npmRequest.url, 'https://registry.test/-/npm/v1/security/audits');

  let calls = 0;
  const redis = {
    values: {},
    async get(key) { return this.values[key]; },
    async setex() { calls++; },
  };
  const fakeAudit = {
    async getAudit() { return undefined; },
  };
  // The Redis service only caches after a successful audit result; registry errors leave it uncached.
  const result = { filePath: 'pnpm-lock.yaml' };
  assert.ok(result && !result.risk);
  assert.strictEqual(await fakeAudit.getAudit({}, {}), undefined);
  const redisService = Object.create(RedisService.prototype);
  const cache = {};
  const redisClient = {
    async get(key) { return cache[key]; },
    async setex(key) { cache[key] = key; calls++; },
  };
  redisService.ctx = {
    app: { redis: redisClient, config: { packageAuditPrefix: 'audit:', packageAuditStorage: 90 } },
    service: { audit: fakeAudit },
    logger: { error() {} },
  };
  redisService.getModules = async () => ({ pkg: {}, lock: {}, lockType: 'pnpm', lockImporter: '.' });
  const failedResult = await redisService.checkModuleRisk('app', 'agent', 'package.json', { forceCache: true });
  assert.strictEqual(failedResult.risk, undefined);
  assert.strictEqual(calls, 0);
  assert.strictEqual(cache['audit:app::agent::package.json'], undefined);
  assert.strictEqual(await redis.get('audit'), undefined);

  const packagesByAgent = {};
  const perAgentRedis = {
    async setex(key, ttl, value) { packagesByAgent[key] = value; },
    async get(key) { return packagesByAgent[key]; },
    async del(key) { delete packagesByAgent[key]; },
    async rpush() { return 1; },
  };
  const perAgentService = Object.create(RedisService.prototype);
  perAgentService.ctx = {
    app: { redis: perAgentRedis, config: { packagePrefix: 'pkg:', packageAuditPrefix: 'audit:', packageStorage: 7, packageQueueKey: 'queue' } },
    logger: { error() {} },
  };
  await perAgentService.savePackage('app', 'agent-a', '/app/package.json', '{"dependencies":{"left":"1"}}', '{"dependencies":{}}');
  await perAgentService.savePackage('app', 'agent-b', '/app/package.json', '{"dependencies":{"right":"1"}}', '{"dependencies":{}}');
  assert.deepStrictEqual((await perAgentService.getModules('app', '/app/package.json', 'agent-a')).pkg.dependencies, { left: '1' });
  assert.deepStrictEqual((await perAgentService.getModules('app', '/app/package.json', 'agent-b')).pkg.dependencies, { right: '1' });
  console.log('pnpm-audit core tests passed');
}

run().catch(error => {
  console.error(error.stack);
  process.exitCode = 1;
});
