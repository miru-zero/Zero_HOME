'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const command = require('../src/command');

test('canonical filesystem read-side tools are registered', () => {
  const names = command.listTools().map((tool) => tool.name);
  assert.ok(names.includes('zero.command.filesystem.getFileInfo'));
  assert.ok(names.includes('zero.command.filesystem.globFiles'));
  assert.ok(names.includes('zero.command.filesystem.grepFiles'));
});

test('getFileInfo, globFiles, and grepFiles execute inside roots', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'zero-agent-readside-'));
  const docs = path.join(root, 'docs');
  fs.mkdirSync(docs);
  const readme = path.join(root, 'README.md');
  const guide = path.join(docs, 'guide.txt');
  fs.writeFileSync(readme, 'alpha\nbeta\n');
  fs.writeFileSync(guide, 'beta\ngamma\n');

  const info = command.callTool('zero.command.filesystem.getFileInfo', { path: readme }, { commandRoots: [root] });
  assert.equal(info.ok, true);
  assert.equal(info.type, 'file');
  assert.equal(info.lineCount, 3);

  const glob = command.callTool('zero.command.filesystem.globFiles', { path: root, pattern: '*.md' }, { commandRoots: [root] });
  assert.equal(glob.ok, true);
  assert.deepEqual(glob.files.map((file) => file.relativePath), ['README.md']);

  const grep = command.callTool('zero.command.filesystem.grepFiles', { path: root, pattern: 'beta', literal: true }, { commandRoots: [root] });
  assert.equal(grep.ok, true);
  assert.deepEqual(grep.matches.map((match) => `${match.relativePath}:${match.line}`).sort(), ['README.md:2', 'docs/guide.txt:1']);
});
