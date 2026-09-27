'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const command = require('../src/command');

test('canonical filesystem readFiles and listDirectory are registered', () => {
  const names = command.listTools().map((tool) => tool.name);
  assert.ok(names.includes('zero.command.filesystem.readFiles'));
  assert.ok(names.includes('zero.command.filesystem.listDirectory'));
});

test('canonical filesystem readFiles and listDirectory execute inside roots', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'zero-agent-fs-'));
  const nested = path.join(root, 'nested');
  fs.mkdirSync(nested);
  fs.writeFileSync(path.join(root, 'a.txt'), 'one\n');
  fs.writeFileSync(path.join(nested, 'b.txt'), 'two\n');

  const read = command.callTool('zero.command.filesystem.readFiles', {
    paths: [path.join(root, 'a.txt'), path.join(nested, 'b.txt')]
  }, { commandRoots: [root] });
  assert.equal(read.ok, true);
  assert.equal(read.count, 2);
  assert.ok(read.files[0].content.includes('   1\tone'));
  assert.ok(read.files[1].content.includes('   1\ttwo'));

  const listing = command.callTool('zero.command.filesystem.listDirectory', { path: root, depth: 2 }, { commandRoots: [root] });
  assert.equal(listing.ok, true);
  assert.deepEqual(listing.entries.map((item) => item.relativePath).sort(), ['a.txt', 'nested', 'nested/b.txt']);
});
