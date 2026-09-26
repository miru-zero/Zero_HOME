'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:path');
const command = require('../runtime');

test('zero.command filesystem v2 registry', () => {
  const names = command.listTools().map((tool) => tool.name);
  for (const name of ['copyFile', 'moveFile', 'renameFile', 'exists', 'hashFile']) {
    assert.ok(names.includes(name), `${name} missing`);
  }
});

test('moveFile renameFile exists hashFile work', async () => {
  const root = fs.mkdtempSync(os.join(require('node:os').tmpdir(), 'zero-command-v2-'));
  const source = os.join(root, 'a.txt');
  const moved = os.join(root, 'b.txt');
  const renamed = os.join(root, 'c.txt');
  fs.writeFileSync(source, 'hello');

  assert.equal((await command.callTool('moveFile', { source, destination: moved }, { commandRoots: [root] })).ok, true);
  assert.equal((await command.callTool('renameFile', { source: moved, destination: renamed }, { commandRoots: [root] })).ok, true);
  assert.equal((await command.callTool('exists', { path: renamed }, { commandRoots: [root] })).exists, true);

  const hash = await command.callTool('hashFile', { path: renamed }, { commandRoots: [root] });
  assert.equal(hash.ok, true);
  assert.equal(hash.algorithm, 'sha256');
});
