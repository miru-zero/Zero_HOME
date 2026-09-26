'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const command = require('../src/command');

test('path tools are registered under command.path category', () => {
  const names = command.listTools({ category: 'path' }).map((tool) => tool.name);
  for (const name of ['resolvePath', 'normalizePath', 'joinPath', 'relativePath', 'getParentDirectory', 'getFilename', 'getExtension']) {
    assert.ok(names.includes(`zero.command.path.${name}`), `${name} missing`);
  }
});

test('path tools perform platform path operations without filesystem side effects', () => {
  const joined = command.callTool('zero.command.path.joinPath', { segments: ['alpha', 'beta', 'file.txt'] });
  assert.equal(joined.path, path.join('alpha', 'beta', 'file.txt'));
  const normalized = command.callTool('zero.command.path.normalizePath', { path: 'alpha/../beta//file.txt' });
  assert.equal(normalized.path, path.normalize('alpha/../beta//file.txt'));
  const resolved = command.callTool('zero.command.path.resolvePath', { base: '/tmp/root', path: './file.txt' });
  assert.equal(resolved.path, path.resolve('/tmp/root', './file.txt'));
  const relative = command.callTool('zero.command.path.relativePath', { from: '/tmp/root', to: '/tmp/root/child/file.txt' });
  assert.equal(relative.path, path.relative('/tmp/root', '/tmp/root/child/file.txt'));
  assert.equal(command.callTool('zero.command.path.getParentDirectory', { path: '/tmp/root/file.txt' }).path, path.dirname('/tmp/root/file.txt'));
  assert.equal(command.callTool('zero.command.path.getFilename', { path: '/tmp/root/file.txt' }).name, 'file.txt');
  assert.equal(command.callTool('zero.command.path.getExtension', { path: '/tmp/root/file.txt' }).extension, '.txt');
});
