'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');

const provider = 'chatgpt';

const defaultMcpHome = (env = process.env) => env.ZERO_MCP_HOME || path.join(os.homedir(), '.zero_mcp');
const defaultAuthFile = (env = process.env) => path.join(defaultMcpHome(env), 'chatgpt', 'auth.json');
const resolveAuthFile = (env = process.env) => env.ZERO_CHATGPT_AUTH_FILE || defaultAuthFile(env);

const sha256 = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');
const nowIso = () => new Date().toISOString();

const parseMaybeJson = (text) => {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (error) {
    return { ok: false, error: error.message || String(error) };
  }
};

const ensureInput = (input) => {
  const text = String(input || '').trim();
  if (!text) {
    const error = new Error('input is required');
    error.code = 'BAD_AUTH_INPUT';
    throw error;
  }
  return text;
};
const status = ({ env = process.env } = {}) => {
  const file = resolveAuthFile(env);
  if (!fs.existsSync(file)) {
    return {
      ok: true,
      provider,
      auth: { present: false, status: 'missing', redacted: true },
      file
    };
  }
  const stat = fs.statSync(file);
  let storedStatus = 'imported-test-fixture';
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    storedStatus = parsed.status || storedStatus;
  } catch {}
  return {
    ok: true,
    provider,
    auth: {
      present: true,
      status: storedStatus,
      redacted: true,
      updated_at: stat.mtime.toISOString(),
      size: stat.size
    },
    file
  };
};

const importAuth = ({ input, env = process.env, source = 'zero-agent' } = {}) => {
  const text = ensureInput(input);
  const parsed = parseMaybeJson(text);
  const timestamp = nowIso();
  const payload = {
    provider,
    mode: 'dev-fixture',
    status: 'imported-test-fixture',
    source,
    created_at: timestamp,
    updated_at: timestamp,
    validation: {
      session: 'not-run',
      sentinel: 'not-run',
      capability_probe: 'not-run'
    },
    security: {
      raw_secret_return_allowed: false,
      logs_allowed: false,
      rotation_required: false
    },
    imported: {
      format: parsed.ok ? 'json' : 'text',
      parse_error: parsed.ok ? null : parsed.error,
      sha256: sha256(text),
      byte_length: Buffer.byteLength(text, 'utf8')
    },
    session: parsed.ok ? parsed.value : { raw_text: text }
  };
  const file = resolveAuthFile(env);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(payload, null, 2) + '\n', { encoding: 'utf8', mode: 0o600 });
  return {
    ok: true,
    provider,
    file,
    auth: {
      present: true,
      status: payload.status,
      mode: payload.mode,
      redacted: true,
      updated_at: payload.updated_at,
      input_format: payload.imported.format,
      input_sha256: payload.imported.sha256,
      byte_length: payload.imported.byte_length
    }
  };
};

const chatgptAuth = {
  defaultMcpHome,
  defaultAuthFile,
  resolveAuthFile,
  status,
  importAuth
};

Object.assign(exports, chatgptAuth);
