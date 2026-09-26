'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const command = require('../src/command');

const fixture = (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'zero-agent-readside-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'docs'));
  fs.writeFileSync(path.join(root, 'README.md'), 'alpha\nbeta\n');
  fs.writeFileSync(path.join(root, 'docs', 'guide.txt'), 'beta\ngamma\n');
  return root;
};

test('canonical filesystem read-side tools are registered', () => {
  const names = command.listTools({ provider: 'command', category: 'filesystem' }).map((tool) => tool.name);
  for (const name of [
    'zero.command.filesystem.getFileInfo',
    'zero.command.filesystem.globFiles',
    'zero.command.filesystem.grepFiles'
  ]) assert.ok(names.includes(name), `${name} missing`);
});

test('getFileInfo, globFiles, and grepFiles execute inside roots', (t) => {
  const root = fixture(t);
  const info = command.callTool('zero.command.filesystem.getFileInfo', { path: path.join(root, 'README.md') }, { commandRoots: [root] });
  assert.equal(info.ok, true);
  assert.equal(info.type, 'file');
  assert.equal(info.lineCount, 3);

  const glob = command.callTool('zero.command.filesystem.globFiles', { path: root, pattern: '*.md' }, { commandRoots: [root] });
  assert.equal(glob.ok, true);
  assert.deepEqual(glob.files.map((file) => file.relativePath), ['README.md']);

  const grep = command.callTool('zero.command.filesystem.grepFiles', { path: root, pattern: 'beta', literal: true }, { commandRoots: [root] });
  assert.equal(grep.ok, true);
  assert.deepEqual(grep.matches.map((match) => `${match.relativePath}:${match.line}`).sort(), ['README.md:2', 'docs/guide.txt:1'].sort());
});
