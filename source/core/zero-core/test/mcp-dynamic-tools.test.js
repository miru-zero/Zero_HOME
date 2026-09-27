'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
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
  assert.match(reply.result.structuredContent.setup.url, /^https:\/\/zero\.example\.test\/setup\/chatgpt-auth\?ticket=/);
  assert.equal(reply.result.structuredContent.setup.type, 'chatgpt_browser_widget_setup_flow');
  assert.notEqual(reply.result.structuredContent.setup.ticket, 'dev-fixture');
  assert.equal(reply.result.structuredContent.target.redacted, true);
});


test('MCP Apps resources/list and resources/read expose ChatGPT auth UI resource', async () => {
  const list = await mcp.handle({ jsonrpc: '2.0', id: 7, method: 'resources/list' }, {
    env: {},
    createHub: () => makeHub()
  });

  assert.equal(list.result.resources.some((resource) => resource.uri === 'ui://zero/chatgpt-auth/v1.html'), true);

  const read = await mcp.handle({
    jsonrpc: '2.0',
    id: 8,
    method: 'resources/read',
    params: { uri: 'ui://zero/chatgpt-auth/v1.html' }
  }, {
    env: { ZERO_CHATGPT_WIDGET_DOMAIN: 'https://zero-widget.example.test/' },
    createHub: () => makeHub()
  });

  const content = read.result.contents[0];
  assert.equal(content.mimeType, 'text/html;profile=mcp-app');
  assert.equal(content.uri, 'ui://zero/chatgpt-auth/v1.html');
  assert.match(content.text, /Zero ChatGPT Auth Setup/);
  assert.deepEqual(content._meta['openai/ui'].availableDisplayModes, ['inline', 'fullscreen']);
  assert.equal(content._meta.ui.domain, 'https://zero-widget.example.test');
  assert.equal(content._meta['openai/widgetDomain'], 'https://zero-widget.example.test');
  assert.deepEqual(content._meta['openai/widgetCSP'].connect_domains, ['https://zero-widget.example.test']);
});


test('MCP tools/list links zero.chatgpt.login to the ChatGPT auth app resource', async () => {
  const reply = await mcp.handle({ jsonrpc: '2.0', id: 9, method: 'tools/list' }, {
    env: {},
    createHub: () => makeHub()
  });

  const login = reply.result.tools.find((tool) => tool.name === 'zero.chatgpt.login');
  const importTool = reply.result.tools.find((tool) => tool.name === 'zero.chatgpt.auth.import');
  assert.equal(login._meta.ui.resourceUri, 'ui://zero/chatgpt-auth/v1.html');
  assert.equal(login._meta['openai/outputTemplate'], 'ui://zero/chatgpt-auth/v1.html');
  assert.deepEqual(importTool._meta.ui.visibility, ['app']);
});

test('MCP app import tool consumes setup ticket and writes redacted auth fixture', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zero-mcp-app-auth-'));
  const authFile = path.join(dir, 'auth.json');
  const env = { ZERO_PUBLIC_BASE_URL: 'https://zero.example.test', ZERO_CHATGPT_AUTH_FILE: authFile };
  const login = await mcp.handle({ jsonrpc: '2.0', id: 10, method: 'tools/call', params: { name: 'zero.chatgpt.login', arguments: {} } }, { env, createHub: () => makeHub() });
  const ticket = login.result.structuredContent.setup.ticket;
  const imported = await mcp.handle({ jsonrpc: '2.0', id: 11, method: 'tools/call', params: { name: 'zero.chatgpt.auth.import', arguments: { ticket, input: '{"ok":true}' } } }, { env, createHub: () => makeHub() });

  assert.equal(imported.result.structuredContent.auth.redacted, true);
  assert.equal(fs.existsSync(authFile), true);
  assert.equal(JSON.parse(fs.readFileSync(authFile, 'utf8')).source, 'mcp-app-ui-test');
});
