const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const authSetup = require('../src/api/chatgpt-auth-setup');

test('ChatGPT auth setup writes redacted dev fixture auth file', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zero-chatgpt-auth-'));
  const authFile = path.join(dir, 'auth.json');
  const env = { ZERO_CHATGPT_AUTH_FILE: authFile };

  const result = authSetup.writeAuth({
    input: '{"hello":"world"}',
    env,
    source: 'test'
  });

  assert.equal(result.ok, true);
  assert.equal(result.auth.redacted, true);
  assert.equal(result.auth.input_format, 'json');
  assert.equal(fs.existsSync(authFile), true);

  const stored = JSON.parse(fs.readFileSync(authFile, 'utf8'));
  assert.equal(stored.provider, 'chatgpt');
  assert.equal(stored.mode, 'dev-fixture');
  assert.equal(stored.status, 'imported-test-fixture');
  assert.deepEqual(stored.session, { hello: 'world' });
});
test('ChatGPT auth setup default path uses ZERO_MCP_HOME, not a fixed Windows user', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'zero-mcp-home-'));
  const env = { ZERO_MCP_HOME: root };

  assert.equal(authSetup.defaultMcpHome(env), root);
  assert.equal(
    authSetup.resolveAuthFile(env),
    path.join(root, 'chatgpt', 'auth.json')
  );
});

test('ChatGPT auth setup login returns widget setup ticket without raw secret fields', () => {
  const env = {
    ZERO_PUBLIC_BASE_URL: 'https://zero.example.test',
    ZERO_CHATGPT_AUTH_FILE: path.join(os.tmpdir(), 'zero-chatgpt-auth-status.json')
  };
  const result = authSetup.login({ env });

  assert.equal(result.ok, false);
  assert.equal(result.code, 'CHATGPT_AUTH_SETUP_REQUIRED');
  assert.equal(result.mode, 'chatgpt-browser-widget-setup');
  assert.equal(result.setup.type, 'chatgpt_browser_widget_setup_flow');
  assert.match(result.setup.url, /^https:\/\/zero\.example\.test\/setup\/chatgpt-auth\?ticket=/);
  assert.notEqual(result.setup.ticket, 'dev-fixture');
  assert.equal(result.setup.expires_in_sec, 600);
  assert.equal(result.target.redacted, true);
  assert.equal(JSON.stringify(result).includes('session-token'), false);
});

test('ChatGPT auth setup page requires a ticket from login', () => {
  assert.throws(
    () => authSetup.renderPage({ env: {} }),
    /setup ticket is required/
  );

  const env = { ZERO_PUBLIC_BASE_URL: 'https://zero.example.test' };
  const login = authSetup.login({ env });
  const html = authSetup.renderPage({ env, ticket: login.setup.ticket });

  assert.match(html, /ChatGPT browser\/widget setup only/);
  assert.match(html, new RegExp(login.setup.ticket));
});
