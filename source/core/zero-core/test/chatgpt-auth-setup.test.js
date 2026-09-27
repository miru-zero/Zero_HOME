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

test('ChatGPT auth setup login returns setup URL without raw secret fields', () => {
  const env = {
    ZERO_PUBLIC_BASE_URL: 'https://zero.example.test',
    ZERO_CHATGPT_AUTH_FILE: path.join(os.tmpdir(), 'zero-chatgpt-auth-status.json')
  };
  const result = authSetup.login({ env });

  assert.equal(result.ok, false);
  assert.equal(result.code, 'CHATGPT_AUTH_SETUP_REQUIRED');
  assert.equal(result.setup.url, 'https://zero.example.test/setup/chatgpt-auth?ticket=dev-fixture');
  assert.equal(result.target.redacted, true);
  assert.equal(JSON.stringify(result).includes('session-token'), false);
});
