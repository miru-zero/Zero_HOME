'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const provider = require('../runtime');

test('provider exposes filesystem read tools from canonical agent descriptors', () => {
  const tools = new Map(provider.listTools().map((tool) => [tool.name, tool]));
  assert.equal(tools.get('readFiles').canonicalName, 'zero.command.filesystem.readFiles');
  assert.equal(tools.get('listDirectory').canonicalName, 'zero.command.filesystem.listDirectory');
});

test('provider routes canonical readFiles and listDirectory to agent command library', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'zero-provider-agent-'));
  fs.writeFileSync(path.join(root, 'a.txt'), 'alpha\n');
  fs.mkdirSync(path.join(root, 'docs'));
  fs.writeFileSync(path.join(root, 'docs', 'b.txt'), 'beta\n');
  const read = await provider.callTool('zero.command.filesystem.readFiles', { paths: [path.join(root, 'a.txt')] }, { commandRoots: [root] });
  assert.equal(read.ok, true);
  assert.equal(read.files.length, 1);
  const listing = await provider.callTool('zero.command.filesystem.listDirectory', { path: root, depth: 2 }, { commandRoots: [root] });
  assert.equal(listing.ok, true);
  assert.ok(listing.entries.some((item) => item.relativePath === 'docs/b.txt'));
});
