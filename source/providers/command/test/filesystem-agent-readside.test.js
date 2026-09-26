'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const provider = require('../runtime');

test('provider exposes canonical agent descriptors for read-side filesystem tools', () => {
  const tools = new Map(provider.listTools().map((tool) => [tool.name, tool]));
  assert.equal(tools.get('getFileInfo').canonicalName, 'zero.command.filesystem.getFileInfo');
  assert.equal(tools.get('globFiles').canonicalName, 'zero.command.filesystem.globFiles');
  assert.equal(tools.get('grepFiles').canonicalName, 'zero.command.filesystem.grepFiles');
});

test('provider routes canonical read-side tools to agent command library', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'zero-provider-readside-'));
  fs.writeFileSync(path.join(root, 'README.md'), 'alpha\nbeta\n');
  const info = await provider.callTool('zero.command.filesystem.getFileInfo', { path: path.join(root, 'README.md') }, { commandRoots: [root] });
  assert.equal(info.type, 'file');
  const glob = await provider.callTool('zero.command.filesystem.globFiles', { path: root, pattern: '*.md' }, { commandRoots: [root] });
  assert.deepEqual(glob.files.map((file) => file.relativePath), ['README.md']);
  const grep = await provider.callTool('zero.command.filesystem.grepFiles', { path: root, pattern: 'beta', literal: true }, { commandRoots: [root] });
  assert.deepEqual(grep.matches.map((match) => `${match.relativePath}:${match.line}`), ['README.md:2']);
});
