'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const provider = require('../runtime');

const names = (category) => provider.listTools().filter((tool) => tool.category === category).map((tool) => tool.name);

test('provider exposes complete filesystem and path foundation tools', () => {
  for (const name of ['appendFile', 'createFile', 'touchFile', 'copyDirectory', 'moveDirectory', 'deleteDirectory', 'truncateFile']) {
    assert.ok(names('filesystem').includes(name), `${name} missing`);
  }
  for (const name of ['resolvePath', 'normalizePath', 'joinPath', 'relativePath', 'getParentDirectory', 'getFilename', 'getExtension']) {
    assert.ok(names('path').includes(name), `${name} missing`);
  }
});

test('provider routes filesystem foundation tools through agent', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'zero-provider-fs-foundation-'));
  const ctx = { commandRoots: [root] };
  const file = path.join(root, 'note.txt');
  await provider.callTool('zero.command.filesystem.createFile', { path: file, content: 'alpha' }, ctx);
  await provider.callTool('zero.command.filesystem.appendFile', { path: file, content: 'beta' }, ctx);
  await provider.callTool('zero.command.filesystem.truncateFile', { path: file, size: 5 }, ctx);
  assert.equal(fs.readFileSync(file, 'utf8'), 'alpha');
  const dir = path.join(root, 'dir');
  fs.mkdirSync(dir);
  fs.writeFileSync(path.join(dir, 'a.txt'), 'a');
  const copy = path.join(root, 'copy');
  await provider.callTool('zero.command.filesystem.copyDirectory', { source: dir, destination: copy }, ctx);
  assert.equal(fs.existsSync(path.join(copy, 'a.txt')), true);
});

test('provider routes path tools through agent', async () => {
  const joined = await provider.callTool('zero.command.path.joinPath', { segments: ['a', 'b.txt'] });
  assert.equal(joined.path, path.join('a', 'b.txt'));
  const ext = await provider.callTool('zero.command.path.getExtension', { path: joined.path });
  assert.equal(ext.extension, '.txt');
});
