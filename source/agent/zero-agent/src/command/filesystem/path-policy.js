'use strict';

const os = require('node:os');
const path = require('node:path');

const err = (code, message) => Object.assign(new Error(message), { code });
const normalize = (value) => path.resolve(String(value)).toLowerCase();
const rootsFor = (context = {}, env = context.env || process.env) => {
  const explicit = Array.isArray(context.commandRoots) && context.commandRoots.length
    ? context.commandRoots
    : (Array.isArray(context.roots) ? context.roots : []);
  const configured = explicit.length ? explicit : String(env.ZERO_AGENT_ROOTS || env.ZERO_COMMAND_ROOTS || '')
    .split(';').map((item) => item.trim()).filter(Boolean);
  const roots = configured.length ? configured : [os.homedir(), process.cwd()];
  return roots.map((item) => path.resolve(String(item)));
};
const resolveAllowed = (inputPath, context = {}, env = context.env || process.env) => {
  if (!inputPath || typeof inputPath !== 'string') throw err('INVALID_PATH', 'path is required');
  const roots = rootsFor(context, env);
  const target = path.resolve(inputPath);
  const targetNorm = normalize(target);
  const ok = roots.some((root) => {
    const rootNorm = normalize(root);
    return targetNorm === rootNorm || targetNorm.startsWith(rootNorm + path.sep.toLowerCase());
  });
  if (!ok) throw err('PATH_NOT_ALLOWED', 'path is outside agent allowed roots');
  return target;
};

const pathPolicy = { rootsFor, resolveAllowed };
Object.assign(exports, pathPolicy);
