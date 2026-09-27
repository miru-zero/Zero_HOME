'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const command = require('../src/command');

const expected = [
  'writeFile', 'replaceFile', 'createDirectory', 'deleteFile',
  'copyFile', 'moveFile', 'renameFile', 'exists', 'hashFile'
].map((name) => `zero.command.filesystem.${name}`);

test('canonical filesystem write-side tools are registered', () => {
  const names = command.listTools().map((tool) => tool.name);
  for (const name of expected) assert.ok(names.includes(name), `${name} missing`);
});

test('write, replace, copy, move, rename, exists, hash, and delete execute inside roots', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'zero-agent-write-'));
  const file = path.join(root, 'notes', 'a.txt');
  const copy = path.join(root, 'notes', 'b.txt');
  const moved = path.join(root, 'notes', 'c.txt');
  const renamed = path.join(root, 'notes', 'd.txt');
  const ctx = { commandRoots: [root] };

  assert.equal(command.callTool('zero.command.filesystem.createDirectory', { path: path.dirname(file) }, ctx).ok, true);
  assert.equal(command.callTool('zero.command.filesystem.writeFile', { path: file, content: 'alpha\n', mode: 'overwrite' }, ctx).ok, true);
  assert.equal(command.callTool('zero.command.filesystem.writeFile', { path: file, content: 'beta\n', mode: 'append' }, ctx).ok, true);
  assert.equal(command.callTool('zero.command.filesystem.replaceFile', { path: file, oldString: 'beta', newString: 'gamma', expectedReplacements: 1 }, ctx).replacements, 1);
  assert.equal(fs.readFileSync(file, 'utf8'), 'alpha\ngamma\n');

  assert.equal(command.callTool('zero.command.filesystem.copyFile', { source: file, destination: copy }, ctx).ok, true);
  assert.equal(command.callTool('zero.command.filesystem.moveFile', { source: copy, destination: moved }, ctx).ok, true);
  assert.equal(command.callTool('zero.command.filesystem.renameFile', { source: moved, destination: renamed }, ctx).ok, true);
  assert.equal(command.callTool('zero.command.filesystem.exists', { path: renamed }, ctx).exists, true);
  const hash = command.callTool('zero.command.filesystem.hashFile', { path: renamed }, ctx);
  assert.equal(hash.algorithm, 'sha256');
  assert.match(hash.hash, /^[0-9a-f]{64}$/);
  assert.equal(command.callTool('zero.command.filesystem.deleteFile', { path: renamed }, ctx).deleted, true);
  assert.equal(fs.existsSync(renamed), false);
});
