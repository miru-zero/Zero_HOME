'use strict';

const childProcess = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const config = require('./config');
const pkg = require('../package.json');

const DEFAULT_INTERVAL = 5000;

const q = (value) => '"' + String(value).replace(/"/g, '""') + '"';
const winPath = (value) => String(value).replace(/\//g, '\\');

const defaultRoots = (env = process.env) => {
  if (env.ZERO_AGENT_ROOTS) return env.ZERO_AGENT_ROOTS;
  const home = env.USERPROFILE || os.homedir();
  return [
    path.join(home, 'Desktop', 'zero'),
    path.join(home, 'Downloads')
  ].join(path.delimiter);
};

const startupDir = (env = process.env) => {
  const appData = env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
  return path.join(appData, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup');
};
const paths = (env = process.env) => {
  const home = config.agentHome(env);
  return {
    home,
    launcherFile: path.join(home, 'start-zero-agent.cmd'),
    startupFile: path.join(startupDir(env), 'MiruZeroAgent.vbs'),
    logFile: path.join(config.logDir(env), 'zero-agent.log')
  };
};

const packageSpec = () => pkg.name + '@' + pkg.version;
const localPackageBin = () => path.join(__dirname, '..', 'bin', 'zero-agent.js');

const globalRoot = (env = process.env) => {
  if (env.ZERO_AGENT_GLOBAL_ROOT) return path.resolve(env.ZERO_AGENT_GLOBAL_ROOT);
  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const result = childProcess.spawnSync(npmCmd, ['root', '-g'], {
    env,
    encoding: 'utf8',
    windowsHide: true
  });
  if (result.status !== 0) return null;
  const value = String(result.stdout || '').trim();
  return value ? path.resolve(value) : null;
};

const packageBin = (env = process.env) => {
  if (env.ZERO_AGENT_BIN) return path.resolve(env.ZERO_AGENT_BIN);
  if (env.ZERO_AGENT_SKIP_GLOBAL_INSTALL !== '1') {
    const root = globalRoot(env);
    const candidate = root
      ? path.join(root, '@miruzero', 'zero-agent', 'bin', 'zero-agent.js')
      : null;
    if (candidate && fs.existsSync(candidate)) return candidate;
  }
  return localPackageBin();
};

const nodeBin = (env = process.env) => path.resolve(env.ZERO_AGENT_NODE || process.execPath);

const launcherContent = ({ interval = DEFAULT_INTERVAL, roots, logFile, binFile, nodeFile }, env = process.env) => {
  const home = config.agentHome(env);
  const spec = packageSpec();
  const bin = binFile || packageBin(env);
  const node = nodeFile || nodeBin(env);
  return [
    '@echo off',
    'setlocal',
    'set "ZERO_TRACE=1"',
    'set "ZERO_AGENT_HOME=' + winPath(home) + '"',
    'set "ZERO_AGENT_ROOTS=' + winPath(roots) + '"',
    ...(env.ZERO_MCP_ROOT ? ['set "ZERO_MCP_ROOT=' + winPath(env.ZERO_MCP_ROOT) + '"'] : []),
    'set "ZERO_AGENT_INTERVAL=' + Number(interval || DEFAULT_INTERVAL) + '"',
    'rem interval=' + Number(interval || DEFAULT_INTERVAL) + 'ms',
    'if not exist ' + q(winPath(path.dirname(logFile))) + ' mkdir ' + q(winPath(path.dirname(logFile))),
    'echo [%date% %time%] starting ' + spec + ' >> ' + q(winPath(logFile)),
    q(winPath(node)) + ' ' + q(winPath(bin)) + ' start --interval %ZERO_AGENT_INTERVAL% >> ' + q(winPath(logFile)) + ' 2>&1',
    ''
  ].join('\r\n');
};

const vbsContent = (launcherFile) => [
  'Set WshShell = CreateObject("WScript.Shell")',
  'WshShell.Run Chr(34) & "' + winPath(launcherFile).replace(/"/g, '""') + '" & Chr(34), 0, False',
  ''
].join('\r\n');

const prepare = (options = {}, env = process.env) => {
  config.ensureDirs(env);
  const p = paths(env);
  const interval = Number(options.interval || env.ZERO_AGENT_INTERVAL || DEFAULT_INTERVAL);
  const roots = options.roots || defaultRoots(env);
  const binFile = packageBin(env);
  const nodeFile = nodeBin(env);
  fs.mkdirSync(path.dirname(p.launcherFile), { recursive: true });
  fs.mkdirSync(path.dirname(p.startupFile), { recursive: true });
  fs.mkdirSync(path.dirname(p.logFile), { recursive: true });
  fs.writeFileSync(p.launcherFile, launcherContent({
    interval,
    roots,
    logFile: p.logFile,
    binFile,
    nodeFile
  }, env), 'utf8');
  fs.writeFileSync(p.startupFile, vbsContent(p.launcherFile), 'utf8');
  return { ok: true, interval, roots, binFile, nodeFile, ...p };
};

const isPrepared = (env = process.env) => {
  const p = paths(env);
  return fs.existsSync(p.launcherFile) && fs.existsSync(p.startupFile);
};

const autostart = {
  DEFAULT_INTERVAL,
  defaultRoots,
  paths,
  prepare,
  isPrepared,
  packageBin,
  nodeBin,
  launcherContent
};

Object.assign(exports, autostart);
