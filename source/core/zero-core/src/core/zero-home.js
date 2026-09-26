'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const names = {
  projects: 'projects',
  runtimes: 'runtimes',
  state: 'state',
  sandboxes: 'sandboxes',
  tasks: 'tasks',
  artifacts: 'artifacts',
  cache: 'cache',
  logs: 'logs'
};

const home = (env = process.env) => path.resolve(
  env.ZERO_HOME || path.join(os.homedir(), '.zero')
);

const paths = (env = process.env) => {
  const root = home(env);
  return Object.fromEntries([
    ['home', root],
    ...Object.entries(names).map(([key, value]) => [key, path.join(root, value)])
  ]);
};

const safeSegment = (value, label) => {
  const text = String(value || '').trim();
  if (!text || text === '.' || text === '..' || /[\\/:]/.test(text)) {
    const error = new Error(`invalid ${label}: ${value}`);
    error.code = 'ZERO_HOME_INVALID_SEGMENT';
    throw error;
  }
  return text;
};

const sandboxDir = (taskId, env = process.env) => path.join(
  paths(env).sandboxes,
  safeSegment(taskId, 'task id')
);

const providerStateDir = (provider, env = process.env) => path.join(
  paths(env).state,
  'providers',
  safeSegment(provider, 'provider')
);

const providerLogDir = (provider, env = process.env) => path.join(
  paths(env).logs,
  'providers',
  safeSegment(provider, 'provider')
);

const ensureLayout = (env = process.env) => {
  const resolved = paths(env);
  for (const key of Object.keys(names)) {
    fs.mkdirSync(resolved[key], { recursive: true });
  }
  return resolved;
};

exports.home = home;
exports.paths = paths;
exports.ensureLayout = ensureLayout;
exports.sandboxDir = sandboxDir;
exports.providerStateDir = providerStateDir;
exports.providerLogDir = providerLogDir;
