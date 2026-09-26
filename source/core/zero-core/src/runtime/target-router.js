'use strict';

const zero = require('../../../../packages/zero');
const deviceRegistry = require('../core/device-registry');

const err = (code, message, extra = {}) => Object.assign(new Error(message), { code, ...extra });
const canonicalTool = (tools, toolName) => {
  const tool = tools.find((item) => item.name === toolName
    || item.canonicalName === toolName
    || (Array.isArray(item.aliases) && item.aliases.includes(toolName)));
  if (!tool) throw err('UNKNOWN_TOOL', 'unknown command tool: ' + toolName);
  return tool.canonicalName || (String(tool.name).startsWith('zero.') ? tool.name : `zero.command.${tool.name}`);
};

const route = async ({ provider, tool, args = {}, context = {}, env = process.env, listTools, localCall }) => {
  const target = zero.target.normalize(context.target);
  if (target.kind === 'local') return localCall();
  if (provider !== 'command') throw err('REMOTE_PROVIDER_UNSUPPORTED', `remote target is not supported for provider: ${provider}`);
  const waitMs = Number.isInteger(context.waitMs) ? Math.max(0, Math.min(context.waitMs, 60000)) : 15000;
  const deadline = context.deadline || new Date(Date.now() + Math.max(waitMs, 1000)).toISOString();
  const created = deviceRegistry.createTask({
    ...(target.device_id ? { device_id: target.device_id } : { name: target.name }),
    tool: canonicalTool(await listTools(), tool),
    arguments: args,
    contractVersion: zero.contract.version,
    deadline
  }, env);
  const finished = await deviceRegistry.waitTask(created.task.task_id, waitMs, env);
  if (finished.timeout) throw err('REMOTE_TIMEOUT', 'remote task timed out', { retryable: true });
  if (!finished.ok) {
    const remote = finished.task.error || { code: 'REMOTE_TOOL_FAILED', message: 'remote tool failed' };
    throw err(remote.code || 'REMOTE_TOOL_FAILED', remote.message || 'remote tool failed', { retryable: remote.retryable === true });
  }
  return finished.task.result;
};

const targetRouter = { route };
Object.assign(exports, targetRouter);
