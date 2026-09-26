'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const nowIso = () => new Date().toISOString();
const defaultFile = () => path.resolve(__dirname, '../../../.zero/logs/devices/reports.jsonl');

exports.resolveFile = (env = process.env) => env.ZERO_REPORT_FILE
  ? path.resolve(env.ZERO_REPORT_FILE)
  : defaultFile();

const err = (code, message) => Object.assign(new Error(message), { code });

const sensitiveKey = (key) => /(^|_)(token|secret|password|authorization|cookie)($|_)/i.test(String(key || ''))
  || /^(content|oldString|newString|body|data)$/i.test(String(key || ''));

const redacted = (value) => {
  if (value === null || value === undefined) return { redacted: true, type: String(value) };
  if (Buffer.isBuffer(value)) return { redacted: true, type: 'buffer', bytes: value.length };
  if (typeof value === 'string') return { redacted: true, type: 'string', length: value.length };
  if (Array.isArray(value)) return { redacted: true, type: 'array', length: value.length };
  if (typeof value === 'object') return { redacted: true, type: 'object', keys: Object.keys(value).length };
  return { redacted: true, type: typeof value };
};

const sanitize = (value, key = '', depth = 0) => {
  if (sensitiveKey(key)) return redacted(value);
  if (depth > 5) return '[max-depth]';
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return value.length > 500 ? value.slice(0, 500) + '…' : value;
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Buffer.isBuffer(value)) return { type: 'buffer', bytes: value.length };
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => sanitize(item, '', depth + 1));
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).slice(0, 50).map(([name, item]) => [name, sanitize(item, name, depth + 1)])
    );
  }
  return String(value);
};

exports.sanitize = sanitize;

const diagnosis = (error = {}, context = {}) => {
  const code = String(error.code || 'TOOL_FAILED').toUpperCase();
  const message = String(error.message || '').toLowerCase();
  const result = (owner, confidence, category, why, fix) => ({
    owner,
    confidence,
    category,
    why,
    fix
  });

  if (code === 'UNKNOWN_AGENT_TOOL') {
    return result(
      'agent_contract',
      'high',
      'contract_mismatch',
      'Zero Core dispatched a tool that the target agent did not recognize or allow. The agent artifact/tool catalog is likely stale or out of sync with Core.',
      [
        'Compare the Core command catalog with the target agent local tool catalog.',
        'Deploy the matching zero-agent artifact to the target device.',
        'Restart the agent and verify capability sync before retrying the task.'
      ]
    );
  }
  if (code === 'UNKNOWN_TOOL') {
    return result(
      'provider_contract',
      'high',
      'contract_mismatch',
      'The selected provider does not expose the requested tool name.',
      [
        'Verify the provider tool catalog and canonical tool name.',
        'Check Core/provider schema parity.',
        'Refresh MCP/provider capabilities after the contract is corrected.'
      ]
    );
  }
  if (code === 'PATH_NOT_ALLOWED') {
    return result(
      'policy',
      'high',
      'path_policy',
      'The requested path is outside the target agent allowed roots.',
      [
        'Use a path under ZERO_AGENT_ROOTS.',
        'If the path is intentionally required, update the allowed roots explicitly and restart the agent.',
        'Do not bypass the root check.'
      ]
    );
  }
  if (code === 'FILE_NOT_FOUND' || code === 'ENOENT') {
    return result(
      'input_or_state',
      'high',
      'missing_path',
      'The requested file or path did not exist when the tool ran.',
      [
        'Verify the parent directory and path spelling with getFileInfo/listDirectory.',
        'Create the required file/directory when that is the intended workflow.',
        'Retry only after confirming the expected state.'
      ]
    );
  }
  if (code === 'NOT_A_FILE') {
    return result(
      'input_or_state',
      'high',
      'path_type',
      'A file-only operation received a directory or another non-file path.',
      [
        'Inspect the path type with getFileInfo.',
        'Use the directory-specific tool when the target is a directory.'
      ]
    );
  }
  if (code === 'REPLACE_COUNT_MISMATCH') {
    return result(
      'state_conflict',
      'high',
      'precondition_failed',
      'The file contents changed or did not match the expected replacement precondition.',
      [
        'Read the current file before retrying.',
        'Recalculate the expected replacement count from current content.',
        'Avoid blind replacement when the file may have changed concurrently.'
      ]
    );
  }
  if (code === 'DEVICE_NOT_FOUND') {
    return result(
      'routing',
      'high',
      'device_routing',
      'The requested target device was not present in the current Zero device registry.',
      [
        'Run zero.devices.list and verify the device identity.',
        'Pair/register the intended device if it is missing.',
        'Retry using the verified device_id or unique name.'
      ]
    );
  }
  if (code === 'DEVICE_UNAUTHORIZED' || code === 'BAD_PAIRING_CODE') {
    return result(
      'auth_pairing',
      'high',
      'device_auth',
      'The device identity or pairing credential was rejected by Zero Core.',
      [
        'Verify the saved device identity and pairing state.',
        'Re-pair the device through the supported setup flow if credentials are stale.',
        'Do not copy device tokens between machines.'
      ]
    );
  }
  if (code.includes('TIMEOUT') || code === 'ETIMEDOUT' || message.includes('timed out')) {
    return result(
      'network_environment',
      'medium',
      'timeout',
      'The operation did not finish inside the configured wait/timeout window.',
      [
        'Check device heartbeat and task status.',
        'Confirm the agent polling interval is below the caller wait window.',
        'Increase the timeout only when the operation is expected to be long-running.'
      ]
    );
  }
  if (['ECONNRESET', 'ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN'].includes(code)) {
    return result(
      'network_environment',
      'high',
      'network',
      'The tool failed while establishing or maintaining a network connection.',
      [
        'Check network reachability and DNS from the executing device.',
        'Verify the target service endpoint is listening.',
        'Allow the Zero Agent reconnect loop to recover before retrying.'
      ]
    );
  }
  if (code === 'CONFIG_INVALID') {
    return result(
      'configuration',
      'high',
      'configuration',
      'Zero could not load or validate the provider/runtime configuration.',
      [
        'Inspect the referenced config or provider manifest.',
        'Validate paths and required fields.',
        'Restart only after the configuration passes local tests.'
      ]
    );
  }

  return result(
    context.source === 'device_task' ? 'agent_or_input' : 'unknown',
    'low',
    'unclassified',
    'The captured evidence is not specific enough for a deterministic root-cause classification.',
    [
      'Inspect the error code/message together with the sanitized arguments and target metadata.',
      'Reproduce the smallest failing call.',
      'Add a diagnosis rule after the root cause is verified.'
    ]
  );
};

exports.diagnose = diagnosis;

const appendEvent = (event, env = process.env) => {
  const file = exports.resolveFile(env);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, JSON.stringify(event) + '\n', 'utf8');
};

const readEvents = (env = process.env) => {
  const file = exports.resolveFile(env);
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      try { return JSON.parse(line); } catch { return null; }
    })
    .filter(Boolean);
};

const materialize = (env = process.env) => {
  const reports = new Map();
  for (const event of readEvents(env)) {
    if (event.event === 'incident') {
      reports.set(event.report_id, { ...event });
    } else if (event.event === 'resolved' && reports.has(event.report_id)) {
      reports.set(event.report_id, {
        ...reports.get(event.report_id),
        status: 'resolved',
        resolved_at: event.at,
        resolution: event.resolution
      });
    }
  }
  return [...reports.values()];
};

exports.capture = (input = {}, env = process.env) => {
  const error = {
    code: String(input.error?.code || 'TOOL_FAILED'),
    message: String(input.error?.message || input.error || 'tool failed')
  };
  const reportId = 'rpt_' + crypto.randomUUID();
  const device = input.device ? sanitize(input.device) : null;
  const analysis = diagnosis(error, input);
  const fingerprint = crypto.createHash('sha256').update(JSON.stringify({
    provider: input.provider || null,
    tool: input.tool || null,
    code: error.code,
    device_id: input.device?.device_id || null
  })).digest('hex').slice(0, 24);
  const item = {
    event: 'incident',
    report_id: reportId,
    fingerprint,
    status: 'open',
    created_at: nowIso(),
    source: input.source || 'tool',
    provider: input.provider || null,
    tool: input.tool || null,
    task_id: input.task_id || null,
    device,
    arguments: sanitize(input.arguments || {}),
    error,
    analysis,
    metadata: sanitize(input.metadata || {})
  };
  appendEvent(item, env);
  return item;
};

exports.list = (filters = {}, env = process.env) => {
  const limit = Math.max(1, Math.min(Number(filters.limit) || 50, 200));
  let reports = materialize(env);
  const match = (field, value) => !value || String(field || '') === String(value);
  reports = reports.filter((item) =>
    match(item.status, filters.status)
    && match(item.provider, filters.provider)
    && match(item.tool, filters.tool)
    && match(item.error?.code, filters.code)
    && match(item.analysis?.owner, filters.owner)
    && match(item.device?.name || item.device?.device_id, filters.device)
  );
  reports.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  return { ok: true, total: reports.length, reports: reports.slice(0, limit) };
};

exports.get = (reportId, env = process.env) => {
  const found = materialize(env).find((item) => item.report_id === reportId);
  if (!found) throw err('REPORT_NOT_FOUND', 'report not found: ' + reportId);
  return found;
};

exports.analyze = (reportId, env = process.env) => {
  const item = exports.get(reportId, env);
  return {
    report_id: item.report_id,
    status: item.status,
    error: item.error,
    analysis: diagnosis(item.error, item),
    evidence: {
      source: item.source,
      provider: item.provider,
      tool: item.tool,
      task_id: item.task_id,
      device: item.device,
      arguments: item.arguments,
      metadata: item.metadata
    }
  };
};

exports.resolve = (reportId, input = {}, env = process.env) => {
  exports.get(reportId, env);
  const resolution = String(input.resolution || '').trim();
  if (!resolution) throw err('RESOLUTION_REQUIRED', 'resolution is required');
  appendEvent({
    event: 'resolved',
    report_id: reportId,
    at: nowIso(),
    resolution: sanitize(resolution)
  }, env);
  return exports.get(reportId, env);
};
