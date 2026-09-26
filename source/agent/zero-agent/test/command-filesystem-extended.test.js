'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const command = require('../src/command');

const tempRoot = () => fs.mkdtempSync(path.join(os.tmpdir(), 'zero-agent-fs-ext-'));

test('extended filesystem tools are registered', () => {
  const names = command.listTools({ category: 'filesystem' }).map((tool) => tool.name);
  for (const name of ['zero.command.filesystem.appendFile', 'zero.command.filesystem.createFile', 'zero.command.filesystem.touchFile',
    'zero.command.filesystem.copyDirectory', 'zero.command.filesystem.moveDirectory', 'zero.command.filesystem.deleteDirectory', 'zero.command.filesystem.truncateFile']) {
    assert.ok(names.includes(name), `${name} missing`);
  }
});

test('extended filesystem tools execute inside allowed roots', () => {
  const root = tempRoot();
  const ctx = { commandRoots: [root] };
  const file = path.join(root, 'note.txt');
  command.callTool('zero.command.filesystem.createFile', { path: file, content: 'alpha' }, ctx);
  command.callTool('zero.command.filesystem.appendFile', { path: file, content: '\nbeta' }, ctx);
  assert.equal(fs.readFileSync(file, 'utf8'), 'alpha\nbeta');
  command.callTool('zero.command.filesystem.truncateFile', { path: file, size: 5 }, ctx);
  assert.equal(fs.readFileSync(file, 'utf8'), 'alpha');
  const touched = command.callTool('zero.command.filesystem.touchFile', { path: path.join(root, 'touch.txt') }, ctx);
  assert.equal(touched.ok, true);
});

test('directory filesystem tools copy move and delete directories', () => {
  const root = tempRoot();
  const ctx = { commandRoots: [root] };
  const source = path.join(root, 'source');
  const copy = path.join(root, 'copy');
  const moved = path.join(root, 'moved');
  fs.mkdirSync(path.join(source, 'nested'), { recursive: true });
  fs.writeFileSync(path.join(source, 'nested', 'a.txt'), 'alpha');
  command.callTool('zero.command.filesystem.copyDirectory', { source, destination: copy }, ctx);
  assert.equal(fs.readFileSync(path.join(copy, 'nested', 'a.txt'), 'utf8'), 'alpha');
  command.callTool('zero.command.filesystem.moveDirectory', { source: copy, destination: moved }, ctx);
  assert.equal(fs.existsSync(copy), false);
  assert.equal(fs.existsSync(path.join(moved, 'nested', 'a.txt')), true);
  command.callTool('zero.command.filesystem.deleteDirectory', { path: moved, recursive: true }, ctx);
  assert.equal(fs.existsSync(moved), false);
});
