'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const command = require('../runtime');

test('provider exposes canonical agent descriptors for read-side filesystem tools', () => {
  const tools = command.listTools();
  for (const name of ['getFileInfo', 'globFiles', 'grepFiles']) {
    const tool = tools.find((item) => item.name === name);
    assert.equal(tool.canonicalName, `zero.command.filesystem.${name}`);
  }
});
test('provider routes canonical read-side tools to agent command library', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'zero-provider-readside-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, 'README.md'), 'alpha\nbeta\n');

  const info = await command.callTool('zero.command.filesystem.getFileInfo', { path: path.join(root, 'README.md') }, { commandRoots: [root] });
  assert.equal(info.type, 'file');

  const glob = await command.callTool('zero.command.filesystem.globFiles', { path: root, pattern: '*.md' }, { commandRoots: [root] });
  assert.equal(glob.files[0].relativePath, 'README.md');

  const grep = await command.callTool('zero.command.filesystem.grepFiles', { path: root, pattern: 'beta', literal: true }, { commandRoots: [root] });
  assert.equal(grep.matches[0].relativePath, 'README.md');
});
