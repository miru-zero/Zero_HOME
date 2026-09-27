'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const mcp = require('../src/api/mcp');

const makeHub = (calls = []) => ({
  listProviders: () => [
    { name: 'command', type: 'internal', description: 'Command provider' },
    { name: 'devices', type: 'internal', description: 'Devices provider' }
  ],
  listTools: async (provider) => {
    if (provider === 'command') {
      return [
        {
          name: 'readFile',
          canonicalName: 'zero.command.filesystem.readFile',
          category: 'filesystem',
          function: 'readFile',
          description: 'Read a file.',
          inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] }
        },
        {
          name: 'getFilename',
          canonicalName: 'zero.command.path.getFilename',
          category: 'path',
          function: 'getFilename',
          description: 'Get a filename.',
          inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] }
        }
      ];
    }
    return [
      {
        name: 'list',
        description: 'List devices.',
        inputSchema: { type: 'object', properties: {} }
      }
    ];
  },
  callTool: async (provider, tool, args, context) => {
    calls.push({ provider, tool, args, hasEnv: Boolean(context.env) });
    return { ok: true, provider, tool, args };
  },
  close: () => {}
});

test('MCP tools/list is generated from Core hub providers', async () => {
  const reply = await mcp.handle({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, {
    env: {},
    createHub: () => makeHub()
  });

  assert.equal(reply.result.tools.some((tool) => tool.name === 'listZeroTools'), true);
  assert.equal(reply.result.tools.some((tool) => tool.name === 'zero.qa.auth.requireMachineAuth'), true);
  assert.equal(reply.result.tools.some((tool) => tool.name === 'zero.command.filesystem.readFile'), true);
  assert.equal(reply.result.tools.some((tool) => tool.name === 'zero.command.path.getFilename'), true);
  assert.equal(reply.result.tools.some((tool) => tool.name === 'zero.devices.list'), true);
});

test('MCP canonical command and device calls route through Core hub', async () => {
  const calls = [];
  const options = { env: {}, createHub: () => makeHub(calls) };

  await mcp.handle({
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: { name: 'zero.command.filesystem.readFile', arguments: { path: 'README.md' } }
  }, options);
  await mcp.handle({
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: { name: 'zero.devices.list', arguments: { onlineOnly: true } }
  }, options);

  assert.deepEqual(calls.map((item) => [item.provider, item.tool]), [
    ['command', 'readFile'],
    ['devices', 'list']
  ]);
  assert.equal(calls.every((item) => item.hasEnv), true);
});

test('MCP machine auth QA tool requests auth when no auth context exists', async () => {
  const reply = await mcp.handle({
    jsonrpc: '2.0',
    id: 4,
    method: 'tools/call',
    params: {
      name: 'zero.qa.auth.requireMachineAuth',
      arguments: { device: 'MiruZero', reason: 'qa' }
    }
  }, { env: {}, createHub: () => makeHub() });

  assert.equal(reply.error.data.code, 'AUTH_REQUIRED');
  assert.equal(reply.error.data.data.auth.present, false);
  assert.equal(reply.error.data.data.required.raw_secret_allowed_in_chat, false);
  assert.match(reply.error.data.wwwAuthenticate, /AUTH_REQUIRED/);
});

test('MCP machine auth QA tool returns only redacted status when auth is valid', async () => {
  const reply = await mcp.handle({
    jsonrpc: '2.0',
    id: 5,
    method: 'tools/call',
    params: {
      name: 'zero.qa.auth.requireMachineAuth',
      arguments: { device: 'MiruZero', reason: 'qa' }
    }
  }, {
    env: {},
    createHub: () => makeHub(),
    auth: { type: 'machine', status: 'valid', device: 'MiruZero', secret: 'SHOULD_NOT_LEAK' }
  });

  assert.equal(reply.result.structuredContent.ok, true);
  assert.equal(reply.result.structuredContent.auth.redacted, true);
  assert.equal(JSON.stringify(reply), JSON.stringify(reply).includes('SHOULD_NOT_LEAK') ? 'must-not-match' : JSON.stringify(reply));
});



test('MCP tools/list exposes ChatGPT auth setup tools', async () => {
  const reply = await mcp.handle({ jsonrpc: '2.0', id: 5, method: 'tools/list' }, {
    env: {},
    createHub: () => makeHub()
  });

  assert.equal(reply.result.tools.some((tool) => tool.name === 'zero.chatgpt.login'), true);
  assert.equal(reply.result.tools.some((tool) => tool.name === 'zero.chatgpt.auth.status'), true);
});

test('MCP zero.chatgpt.login returns setup UI URL and redacted target', async () => {
  const reply = await mcp.handle({
    jsonrpc: '2.0',
    id: 6,
    method: 'tools/call',
    params: { name: 'zero.chatgpt.login', arguments: {} }
  }, {
    env: { ZERO_PUBLIC_BASE_URL: 'https://zero.example.test' },
    createHub: () => makeHub()
  });

  assert.equal(reply.result.structuredContent.code, 'CHATGPT_AUTH_SETUP_REQUIRED');
  assert.equal(reply.result.structuredContent.setup.url, 'https://zero.example.test/setup/chatgpt-auth?ticket=dev-fixture');
  assert.equal(reply.result.structuredContent.target.redacted, true);
});
