'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const provider = require('../runtime');

test('command provider is a thin adapter over agent command tools', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../runtime/index.js'), 'utf8');
  assert.match(source, /zeroAgent\.command\.callTool/);
  assert.doesNotMatch(source, /require\('node:fs'\)/);
  assert.doesNotMatch(source, /require\('node:crypto'\)/);
  assert.doesNotMatch(source, /const handlers\s*=/);
  assert.doesNotMatch(source, /resolveAllowed\s*=/);
  assert.doesNotMatch(source, /readUtf8\s*=/);
});

test('command provider still exposes legacy names backed by canonical ids', () => {
  const tools = provider.listTools();
  assert.equal(tools.length, 29);
  const pathTools = new Set(['resolvePath', 'normalizePath', 'joinPath', 'relativePath', 'getParentDirectory', 'getFilename', 'getExtension']);
  for (const tool of tools) {
    const category = pathTools.has(tool.name) ? 'path' : 'filesystem';
    assert.equal(tool.canonicalName, `zero.command.${category}.${tool.name}`);
    assert.equal(tool.provider, 'command');
    assert.equal(tool.category, category);
    assert.equal(tool.function, tool.name);
  }
});
