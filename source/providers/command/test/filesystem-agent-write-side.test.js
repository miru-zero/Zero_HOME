'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const provider = require('../runtime');

test('provider exposes canonical agent descriptors for write-side filesystem tools', () => {
  const tools = new Map(provider.listTools().map((tool) => [tool.name, tool]));
  for (const name of ['writeFile', 'replaceFile', 'createDirectory', 'deleteFile', 'copyFile', 'moveFile', 'renameFile', 'exists', 'hashFile']) {
    assert.equal(tools.get(name).canonicalName, `zero.command.filesystem.${name}`);
  }
});

test('provider routes canonical write-side tools to agent command library', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'zero-provider-write-'));
  const ctx = { commandRoots: [root] };
  const file = path.join(root, 'a.txt');
  const copy = path.join(root, 'b.txt');
  const moved = path.join(root, 'c.txt');
  await provider.callTool('zero.command.filesystem.writeFile', { path: file, content: 'alpha\n' }, ctx);
  await provider.callTool('zero.command.filesystem.replaceFile', { path: file, oldString: 'alpha', newString: 'beta', expectedReplacements: 1 }, ctx);
  await provider.callTool('zero.command.filesystem.copyFile', { source: file, destination: copy }, ctx);
  await provider.callTool('zero.command.filesystem.moveFile', { source: copy, destination: moved }, ctx);
  const exists = await provider.callTool('zero.command.filesystem.exists', { path: moved }, ctx);
  assert.equal(exists.exists, true);
  const hash = await provider.callTool('zero.command.filesystem.hashFile', { path: moved }, ctx);
  assert.match(hash.hash, /^[0-9a-f]{64}$/);
  assert.equal((await provider.callTool('zero.command.filesystem.deleteFile', { path: moved }, ctx)).deleted, true);
});
