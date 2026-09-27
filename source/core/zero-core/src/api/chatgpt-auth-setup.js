const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const provider = 'chatgpt';
const defaultAuthFile = (env = process.env) => path.join(
  env.USERPROFILE || 'C:\\Users\\Administrator',
  '.zero_mcp',
  'chatgpt',
  'auth.json'
);

const resolveAuthFile = (env = process.env) => env.ZERO_CHATGPT_AUTH_FILE || defaultAuthFile(env);

const nowIso = () => new Date().toISOString();

const sha256 = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');

const ensureParent = (filePath) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
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

const login = ({ publicConfig = {}, env = process.env } = {}) => {
  const url = `${baseUrl({ publicConfig, env })}/setup/chatgpt-auth?ticket=dev-fixture`;
  return {
    ok: false,
    provider,
    code: 'CHATGPT_AUTH_SETUP_REQUIRED',
    mode: 'setup-ui-test',
    setup: {
      type: 'web_setup_flow',
      url,
      ticket: 'dev-fixture',
      expires_in_sec: null
    },
    target: {
      file: resolveAuthFile(env),
      redacted: true
    },
    instructions: [
      'Open the setup URL.',
      'Paste any test JSON/text into the UI.',
      'Submit to write auth.json. Validation probes are not enabled in this test slice.'
    ]
  };
};

const renderPage = ({ publicConfig = {}, env = process.env } = {}) => {
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
      <p><strong>Test slice:</strong> this UI accepts input and writes <code>auth.json</code>. No live validation, retoken, sentinel, or capability probe is run yet.</p>
      <p class="muted">Target file: <code>${htmlEscape(target)}</code></p>
      <p class="muted">Current status: <code>${htmlEscape(current.auth.status)}</code>, present=<code>${current.auth.present}</code></p>
    </div>
    <form method="post" action="/setup/chatgpt-auth/submit">
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
  return writeAuth({ input, env, source: 'setup-ui-test' });
};

const chatgptAuthSetup = {
  login,
  status,
  writeAuth,
  renderPage,
  submit,
  resolveAuthFile
};

Object.assign(exports, chatgptAuthSetup);
