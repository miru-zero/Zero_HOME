'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const caps = require('../src/capabilities');

test('agent capabilities expose canonical command tools', () => {
  const capability = caps.buildCapabilities({ ...process.env, ZERO_MCP_ROOT: 'M:/Zero_HOME/source' });
  const provider = capability.providers.find((item) => item.name === 'zero-agent-command');
  assert.ok(provider);
  const names = provider.tools.map((tool) => tool.name);
  assert.ok(names.includes('zero.command.filesystem.readFile'));
  assert.ok(names.includes('zero.command.filesystem.listDirectory'));
  assert.ok(names.includes('zero.command.path.joinPath'));
  assert.equal(provider.tool_count, 29);
});
