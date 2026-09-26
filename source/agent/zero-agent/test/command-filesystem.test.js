'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const command = require('../src/command');

test('canonical filesystem readFiles and listDirectory are registered', () => {
  const names = command.listTools({ provider: 'command', category: 'filesystem' }).map((tool) => tool.name);
  assert.ok(names.includes('zero.command.filesystem.readFile'));
  assert.ok(names.includes('zero.command.filesystem.readFiles'));
  assert.ok(names.includes('zero.command.filesystem.listDirectory'));
});

test('canonical filesystem readFiles and listDirectory execute inside roots', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'zero-agent-fs-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const dir = path.join(root, 'nested');
  const one = path.join(root, 'one.txt');
  const two = path.join(dir, 'two.txt');
  fs.mkdirSync(dir);
  fs.writeFileSync(one, 'one\n');
  fs.writeFileSync(two, 'two\n');

  const read = command.callTool('zero.command.filesystem.readFiles', { paths: [one, two] }, { commandRoots: [root] });
  assert.equal(read.ok, true);
  assert.equal(read.count, 2);
  assert.ok(read.files[0].content.includes('one'));
  assert.ok(read.files[1].content.includes('two'));

  const listed = command.callTool('zero.command.filesystem.listDirectory', { path: root, depth: 2 }, { commandRoots: [root] });
  assert.equal(listed.ok, true);
  assert.ok(listed.entries.some((entry) => entry.relativePath === 'one.txt' && entry.type === 'file'));
  assert.ok(listed.entries.some((entry) => entry.relativePath === 'nested/two.txt' && entry.type === 'file'));
});
