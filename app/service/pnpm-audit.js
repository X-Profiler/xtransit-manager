'use strict';

const yaml = require('js-yaml');
const semver = require('semver');

const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const sections = [ 'dependencies', 'devDependencies', 'optionalDependencies' ];

function readLock(lock) {
  if (typeof lock === 'string') return yaml.safeLoad(lock);
  return lock;
}

function fail(reason) {
  const error = new Error(reason);
  error.code = 'PNPM_AUDIT_INCOMPLETE';
  throw error;
}

function parseKey(key) {
  if (/^\d+\.\d+\.\d+(?:[-+(]|$)/.test(key)) return null;
  let match = key.match(/^\/?((?:@[^/]+\/)?[^/@]+)@([^(_/]+(?:\.[^(_/]+){2}[^(_/]*)(?:[_(/]|$)/);
  if (match && semver.valid(match[2])) return { name: match[1], version: match[2] };
  match = key.match(/^\/((?:@[^/]+\/)?[^/]+)\/(\d+\.\d+\.\d+(?:-[^_(/]+)?)(?:[_(/]|$)/);
  if (match && semver.valid(match[2])) return { name: match[1], version: match[2] };
  return null;
}

function packageIndex(lock) {
  const index = Object.create(null);
  index.__refs = Object.create(null);
  const packages = lock.packages || {};
  const snapshots = lock.snapshots || {};
  for (const key of Object.keys(packages).concat(Object.keys(snapshots))) {
    const data = packages[key] || {};
    const snapshot = snapshots[key] || {};
    const identity = parseKey(key);
    if (identity) {
      const id = `${identity.name}@${identity.version}`;
      if (!index[id]) index[id] = [];
      if (!index[id].some(entry => entry.key === key)) index[id].push({ key, data, snapshot });
    } else if (data.name) {
      const id = `${data.name}@${key.replace(/^\/?/, '')}`;
      if (!index[id]) index[id] = [];
      if (!index[id].some(entry => entry.key === key)) index[id].push({ key, data, snapshot });
    }
    const ref = key.replace(/^\/?/, '').replace(/^.*@file:/, 'file:');
    index.__refs[ref] = { key, data, snapshot };
  }
  return index;
}

function refValue(value) {
  return value && typeof value === 'object' ? value.version : value;
}

function workspaceImporter(importer, link) {
  const path = require('path').posix;
  const value = link.replace(/^(?:workspace:|link:)/, '');
  if (!value || value === '*') return null;
  return path.normalize(path.join(importer, value));
}

function resolve(name, value, index) {
  let ref = refValue(value);
  if (typeof ref !== 'string') return null;
  if (ref.startsWith('file:')) {
    const entry = index.__refs[ref];
    return entry && entry.data.name === name ? { name, version: entry.data.version || '0.0.0', entry, local: true } : null;
  }
  if (ref.startsWith('npm:')) {
    const alias = ref.slice(4);
    const at = alias.lastIndexOf('@');
    if (at < 1) return null;
    name = alias.slice(0, at);
    ref = alias.slice(at + 1);
  }
  const exactKey = ref;
  const keyIdentity = parseKey(ref);
  if (keyIdentity) {
    name = keyIdentity.name;
    ref = keyIdentity.version;
  }
  const match = ref.match(/^(\d+\.\d+\.\d+(?:-[^(_/]+)?)(?:[_(/]|$)/);
  const version = match && semver.valid(match[1]);
  if (!version) return null;
  const candidates = index[`${name}@${version}`] || [];
  const exact = candidates.find(entry => entry.key === exactKey || entry.key === exactKey.replace(/^\//, '') || entry.key === `${name}@${exactKey}`);
  if (/[(_]/.test(exactKey) && !exact) return null;
  const entry = exact || (candidates.length === 1 ? candidates[0] : null);
  return entry && { name, version, entry };
}

function parsePnpmLock(input, importer = '.') {
  const lock = readLock(input);
  if (!lock || ![ '6.0', '9.0' ].includes(String(lock.lockfileVersion))) fail('unsupported pnpm lockfile version');
  if (!lock.importers) {
    lock.importers = { '.': {
      dependencies: lock.dependencies || {},
      devDependencies: lock.devDependencies || {},
      optionalDependencies: lock.optionalDependencies || {},
    } };
  }
  if (!own(lock.importers, importer)) fail('pnpm importer missing');
  const index = packageIndex(lock);
  const nodes = [];
  const roots = [];
  const seen = new Set();
  const active = new Set();
  function visit(name, value, parent, topLevel, dev, optional, importerPath) {
    const ref = refValue(value);
    if (typeof ref === 'string' && /^(workspace:|link:)/.test(ref)) {
      const target = workspaceImporter(importerPath, ref);
      if (!target) fail('pnpm workspace reference cannot be resolved');
      if (!own(lock.importers, target)) fail('pnpm workspace reference cannot be resolved');
      const importerKey = `workspace:${target}`;
      if (active.has(importerKey)) return;
      active.add(importerKey);
      for (const section of sections) {
        for (const child of Object.keys(lock.importers[target][section] || {})) {
          visit(child, lock.importers[target][section][child], parent ? `${parent} > ${child}` : `${name} > ${child}`, topLevel || name, dev || section === 'devDependencies', optional || section === 'optionalDependencies', target);
        }
      }
      active.delete(importerKey);
      return;
    }
    const resolved = resolve(name, value, index);
    if (!resolved) fail('pnpm package reference cannot be resolved');
    const nodePath = parent || name;
    const node = { name: resolved.name, version: resolved.version, path: nodePath, topLevel: topLevel || name, dev, optional };
    const visitKey = `${resolved.entry.key}|${node.topLevel}|${dev}|${optional}`;
    if (seen.has(visitKey)) return;
    seen.add(visitKey);
    if (!resolved.local) nodes.push(node);
    if (active.has(resolved.entry.key)) return;
    active.add(resolved.entry.key);
    const dependencies = Object.assign({}, resolved.entry.data && resolved.entry.data.dependencies, resolved.entry.snapshot && resolved.entry.snapshot.dependencies);
    const optionals = Object.assign({}, resolved.entry.data && resolved.entry.data.optionalDependencies, resolved.entry.snapshot && resolved.entry.snapshot.optionalDependencies);
    for (const child of Object.keys(dependencies)) visit(child, dependencies[child], `${nodePath} > ${child}`, node.topLevel, dev, optional, importerPath);
    for (const child of Object.keys(optionals)) visit(child, optionals[child], `${nodePath} > ${child}`, node.topLevel, dev, true, importerPath);
    active.delete(resolved.entry.key);
  }
  for (const section of sections) {
    for (const name of Object.keys(lock.importers[importer][section] || {})) {
      const value = lock.importers[importer][section][name];
      roots.push({ name, section, value });
      visit(name, value, '', name, section === 'devDependencies', section === 'optionalDependencies', importer);
    }
  }
  return { nodes, roots, lock };
}

function advisoryMatches(advisory, version) {
  if (!advisory || typeof advisory.vulnerable_versions !== 'string' || !semver.validRange(advisory.vulnerable_versions)) fail('invalid advisory version range');
  return semver.satisfies(version, advisory.vulnerable_versions, { includePrerelease: true });
}

function auditPnpm(graph, advisories) {
  if (!advisories || typeof advisories !== 'object' || Array.isArray(advisories)) fail('invalid advisory response');
  for (const [ name, entries ] of Object.entries(advisories)) {
    if (!Array.isArray(entries) || !graph.nodes.some(node => node.name === name)) fail('invalid advisory entry');
    for (const entry of entries) {
      if (!entry || typeof entry.vulnerable_versions !== 'string' || !semver.validRange(entry.vulnerable_versions)) fail('invalid advisory version range');
    }
  }
  const vulnerabilities = { info: 0, low: 0, moderate: 0, high: 0, critical: 0, total: 0 };
  const riskModules = {};
  const affected = new Set();
  for (const node of graph.nodes) {
    const found = advisories[node.name] || [];
    if (!Array.isArray(found)) fail('invalid advisory entry');
    for (const advisory of found) {
      if (!advisoryMatches(advisory, node.version)) continue;
      if (!own(vulnerabilities, advisory.severity) || advisory.severity === 'total') fail('invalid advisory severity');
      const key = `${node.name}@${node.version}:${advisory.id || advisory.url || advisory.vulnerable_versions}`;
      if (!affected.has(key)) {
        affected.add(key);
        vulnerabilities[advisory.severity]++;
        vulnerabilities.total++;
      }
      if (!riskModules[node.topLevel]) riskModules[node.topLevel] = [];
      riskModules[node.topLevel].push({ name: node.name, path: node.path, dev: Boolean(node.dev), cmd: `pnpm update ${node.topLevel}`, vulnerable_versions: advisory.vulnerable_versions, url: advisory.url || '', severity: advisory.severity, currentVersions: node.version });
    }
  }
  const dependencies = { prod: 0, dev: 0, optional: 0, total: graph.nodes.length };
  for (const node of graph.nodes) dependencies[node.optional ? 'optional' : node.dev ? 'dev' : 'prod']++;
  return { metadata: { vulnerabilities, dependencies, totalDependencies: new Set(graph.nodes.map(node => `${node.name}@${node.version}`)).size }, riskModules };
}

module.exports = { readLock, parsePnpmLock, auditPnpm, advisoryMatches };
