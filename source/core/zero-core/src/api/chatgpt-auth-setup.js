const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');

const provider = 'chatgpt';
const setupTickets = new Map();
const defaultSetupTtlMs = 10 * 60 * 1000;
const defaultMcpHome = (env = process.env) => env.ZERO_MCP_HOME || path.join(os.homedir(), '.zero_mcp');
const defaultAuthFile = (env = process.env) => path.join(
  defaultMcpHome(env),
  'chatgpt',
  'auth.json'
);

const resolveAuthFile = (env = process.env) => env.ZERO_CHATGPT_AUTH_FILE || defaultAuthFile(env);

const nowIso = () => new Date().toISOString();

const sha256 = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');

const ensureParent = (filePath) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
};

const setupError = (code, message) => {
  const error = new Error(message);
  error.code = code;
  return error;
};

const createSetupTicket = ({ now = Date.now(), ttlMs = defaultSetupTtlMs, source = 'chatgpt-widget' } = {}) => {
  const ticket = crypto.randomBytes(24).toString('base64url');
  const expiresAt = now + ttlMs;
  setupTickets.set(ticket, { ticket, source, createdAt: now, expiresAt, used: false });
  return { ticket, expiresAt, expiresInSec: Math.floor(ttlMs / 1000) };
};

const readSetupTicket = (ticket, { now = Date.now(), consume = false } = {}) => {
  if (!ticket) throw setupError('SETUP_TICKET_REQUIRED', 'setup ticket is required; start from zero.chatgpt.login in ChatGPT');
  const entry = setupTickets.get(String(ticket));
  if (!entry) throw setupError('SETUP_TICKET_INVALID', 'setup ticket is invalid; start from zero.chatgpt.login in ChatGPT');
  if (entry.used) throw setupError('SETUP_TICKET_USED', 'setup ticket was already used; start a new setup from zero.chatgpt.login');
  if (entry.expiresAt <= now) {
    setupTickets.delete(String(ticket));
    throw setupError('SETUP_TICKET_EXPIRED', 'setup ticket expired; start a new setup from zero.chatgpt.login');
  }
  if (consume) entry.used = true;
  return entry;
};

const htmlEscape = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const parseMaybeJson = (text) => {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (error) {
    return { ok: false, error: error.message || String(error) };
  }
};

const readTextBody = async (req, { limitBytes = 1024 * 1024 * 4 } = {}) => {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > limitBytes) {
      const error = new Error('request body too large');
      error.code = 'BODY_TOO_LARGE';
      throw error;
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
};

const extractPayload = (contentType, bodyText) => {
  if ((contentType || '').includes('application/json')) {
    const parsed = JSON.parse(bodyText || '{}');
    return typeof parsed.input === 'string'
      ? parsed.input
      : JSON.stringify(parsed.input ?? parsed, null, 2);
  }
  if ((contentType || '').includes('application/x-www-form-urlencoded')) {
    return new URLSearchParams(bodyText).get('input') || '';
  }
  return bodyText || '';
};

const extractTicket = (contentType, bodyText) => {
  if ((contentType || '').includes('application/json')) {
    const parsed = JSON.parse(bodyText || '{}');
    return typeof parsed.ticket === 'string' ? parsed.ticket : '';
  }
  if ((contentType || '').includes('application/x-www-form-urlencoded')) {
    return new URLSearchParams(bodyText).get('ticket') || '';
  }
  return '';
};

const status = ({ env = process.env } = {}) => {
  const filePath = resolveAuthFile(env);
  if (!fs.existsSync(filePath)) {
    return {
      ok: true,
      provider,
      auth: { present: false, status: 'missing', redacted: true },
      file: filePath
    };
  }
  const stat = fs.statSync(filePath);
  return {
    ok: true,
    provider,
    auth: {
      present: true,
      status: 'imported-test-fixture',
      redacted: true,
      updated_at: stat.mtime.toISOString(),
      size: stat.size
    },
    file: filePath
  };
};

const writeAuth = ({ input, env = process.env, source = 'setup-ui-test' }) => {
  const text = String(input || '').trim();
  if (!text) {
    const error = new Error('input is required');
    error.code = 'BAD_AUTH_INPUT';
    throw error;
  }
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
  const filePath = resolveAuthFile(env);
  ensureParent(filePath);
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  return {
    ok: true,
    provider,
    file: filePath,
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

const baseUrl = ({ publicConfig = {}, env = process.env } = {}) => (
  env.ZERO_PUBLIC_BASE_URL
  || publicConfig.baseUrl
  || `http://127.0.0.1:${env.ZERO_SERVER_PORT || publicConfig.port || 8050}`
).replace(/\/$/, '');

const login = ({ publicConfig = {}, env = process.env, source = 'chatgpt-widget' } = {}) => {
  const issued = createSetupTicket({ source });
  const url = `${baseUrl({ publicConfig, env })}/setup/chatgpt-auth?ticket=${encodeURIComponent(issued.ticket)}`;
  return {
    ok: false,
    provider,
    code: 'CHATGPT_AUTH_SETUP_REQUIRED',
    mode: 'chatgpt-browser-widget-setup',
    setup: {
      type: 'chatgpt_browser_widget_setup_flow',
      url,
      ticket: issued.ticket,
      expires_in_sec: issued.expiresInSec
    },
    target: {
      file: resolveAuthFile(env),
      redacted: true
    },
    instructions: [
      'Start this setup from the ChatGPT browser/widget action only.',
      'Paste test JSON/text into the setup UI opened from that action.',
      'Submit to write auth.json. Validation probes are not enabled in this test slice.'
    ]
  };
};

const renderPage = ({ publicConfig = {}, env = process.env, ticket } = {}) => {
  readSetupTicket(ticket);
  const target = resolveAuthFile(env);
  const current = status({ env });
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Zero ChatGPT Auth Setup</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 0; padding: 24px; background: #111; color: #eee; }
    main { max-width: 920px; margin: 0 auto; }
    textarea { width: 100%; min-height: 340px; box-sizing: border-box; font-family: ui-monospace, monospace; font-size: 13px; border-radius: 10px; padding: 12px; }
    button { margin-top: 12px; padding: 10px 16px; border-radius: 999px; border: 0; font-weight: 700; }
    code, pre { background: #222; border-radius: 8px; padding: 2px 6px; }
    .card { background: #1b1b1b; border: 1px solid #333; border-radius: 16px; padding: 16px; margin: 16px 0; }
    .muted { color: #aaa; }
  </style>
</head>
<body>
  <main>
    <h1>Zero ChatGPT Auth Setup</h1>
    <div class="card">
      <p><strong>ChatGPT browser/widget setup only:</strong> this page requires a setup ticket from <code>zero.chatgpt.login</code>.</p>
      <p><strong>Test slice:</strong> this UI accepts input and writes <code>auth.json</code>. No live validation, retoken, sentinel, or capability probe is run yet.</p>
      <p class="muted">Target file: <code>${htmlEscape(target)}</code></p>
      <p class="muted">Current status: <code>${htmlEscape(current.auth.status)}</code>, present=<code>${current.auth.present}</code></p>
    </div>
    <form method="post" action="/setup/chatgpt-auth/submit">
      <input type="hidden" name="ticket" value="${htmlEscape(ticket)}">
      <label for="input">Paste test JSON/text</label>
      <textarea id="input" name="input" spellcheck="false" autocomplete="off" placeholder='{ "test": true }'></textarea>
      <br>
      <button type="submit">Write auth.json</button>
    </form>
  </main>
</body>
</html>`;
};

const submit = async ({ req, env = process.env } = {}) => {
  const contentType = req.headers['content-type'] || '';
  const bodyText = await readTextBody(req);
  const input = extractPayload(contentType, bodyText);
  const ticket = extractTicket(contentType, bodyText);
  readSetupTicket(ticket, { consume: true });
  return writeAuth({ input, env, source: 'chatgpt-widget-setup-ui-test' });
};

const chatgptAuthSetup = {
  login,
  status,
  writeAuth,
  renderPage,
  submit,
  resolveAuthFile,
  createSetupTicket,
  readSetupTicket,
  defaultMcpHome
};

Object.assign(exports, chatgptAuthSetup);
