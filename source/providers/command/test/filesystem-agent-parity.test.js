'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const command = require('../runtime');

test('provider exposes filesystem read tools from canonical agent descriptors', () => {
  const tools = command.listTools();
  const readFiles = tools.find((tool) => tool.name === 'readFiles');
  const listDirectory = tools.find((tool) => tool.name === 'listDirectory');
  assert.equal(readFiles.canonicalName, 'zero.command.filesystem.readFiles');
  assert.equal(listDirectory.canonicalName, 'zero.command.filesystem.listDirectory');
});
test('provider routes canonical readFiles and listDirectory to agent command library', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'zero-provider-agent-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const child = path.join(root, 'child');
  fs.mkdirSync(child);
  fs.writeFileSync(path.join(root, 'a.txt'), 'alpha\n');
  fs.writeFileSync(path.join(child, 'b.txt'), 'beta\n');

  const read = await command.callTool('zero.command.filesystem.readFiles', {
    paths: [path.join(root, 'a.txt'), path.join(child, 'b.txt')]
  }, { commandRoots: [root] });
  assert.equal(read.ok, true);
  assert.equal(read.count, 2);

  const listed = await command.callTool('zero.command.filesystem.listDirectory', { path: root, depth: 2 }, { commandRoots: [root] });
  assert.ok(listed.entries.some((entry) => entry.relativePath === 'child/b.txt'));
});
