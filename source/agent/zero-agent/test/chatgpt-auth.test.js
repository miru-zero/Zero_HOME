const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const chatgptAuth = require('../src/chatgpt-auth');
const agent = require('../src/agent');
const caps = require('../src/capabilities');

test('agent ChatGPT auth import writes dynamic ZERO_MCP_HOME path with redacted result', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'zero-agent-chatgpt-'));
  const env = { ZERO_MCP_HOME: home };
  const result = chatgptAuth.importAuth({ input: '{"dev":true}', env, source: 'test' });

  assert.equal(result.ok, true);
  assert.equal(result.auth.redacted, true);
  assert.equal(result.file, path.join(home, 'chatgpt', 'auth.json'));
  assert.equal(result.file.includes('C:\\Users\\Administrator'), false);

  const stored = JSON.parse(fs.readFileSync(result.file, 'utf8'));
  assert.equal(stored.provider, 'chatgpt');
  assert.deepEqual(stored.session, { dev: true });
});

test('agent executeTask routes ChatGPT auth status and import tools', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'zero-agent-chatgpt-task-'));
  const env = { ZERO_MCP_HOME: home };

  const missing = agent.executeTask({ tool: 'zero.chatgpt.auth.status' }, env);
  assert.equal(missing.auth.present, false);

  const imported = agent.executeTask({
    tool: 'zero.chatgpt.auth.import',
    arguments: { input: '{"task":true}' }
  }, env);
  assert.equal(imported.auth.redacted, true);

  const present = agent.executeTask({ tool: 'zero.chatgpt.auth.status' }, env);
  assert.equal(present.auth.present, true);
});

test('agent capabilities expose ChatGPT auth tools', () => {
  const capability = caps.buildCapabilities({});
  const provider = capability.providers.find((item) => item.name === 'chatgpt');
  assert.ok(provider);
  assert.equal(provider.tools.some((tool) => tool.canonicalName === 'zero.chatgpt.auth.status'), true);
  assert.equal(provider.tools.some((tool) => tool.canonicalName === 'zero.chatgpt.auth.import'), true);
});
