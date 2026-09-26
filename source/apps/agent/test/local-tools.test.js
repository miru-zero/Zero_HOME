'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const localTools = require('../src/local-tools');

test('local tools allow reads inside ZERO_AGENT_ROOTS', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'zero-agent-root-'));
  fs.writeFileSync(path.join(root, 'hello.txt'), 'hello', 'utf8');
  const result = localTools.execute('command.listDirectory', { path: root, depth: 1 }, { ZERO_AGENT_ROOTS: root });
  assert.equal(result.ok, true);
  assert.deepEqual(result.entries.map((item) => item.relativePath), ['hello.txt']);
});

test('local tools read multiple files with per-file results', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'zero-agent-multi-'));
  const a = path.join(root, 'a.txt');
  const b = path.join(root, 'b.txt');
  fs.writeFileSync(a, 'a1\na2', 'utf8');
  fs.writeFileSync(b, 'b1\nb2', 'utf8');
  const result = localTools.execute('command.readFiles', {
    paths: [a, b, path.join(root, 'missing.txt')],
    offset: 0,
    length: 1
  }, { ZERO_AGENT_ROOTS: root });
  assert.equal(result.count, 3);
  assert.equal(result.succeeded, 2);
  assert.equal(result.failed, 1);
  assert.match(result.files[0].content, /a1/);
  assert.match(result.files[1].content, /b1/);
  assert.equal(result.files[2].ok, false);

  const perFile = localTools.execute('command.readFiles', {
    files: [{ path: a, offset: 1, length: 1 }, { path: b, offset: 0, length: 1 }]
  }, { ZERO_AGENT_ROOTS: root });
  assert.equal(perFile.ok, true);
  assert.match(perFile.files[0].content, /a2/);
  assert.match(perFile.files[1].content, /b1/);
});

test('local tools reject paths outside ZERO_AGENT_ROOTS', () => {
  const allowed = fs.mkdtempSync(path.join(os.tmpdir(), 'zero-agent-allowed-'));
  const denied = fs.mkdtempSync(path.join(os.tmpdir(), 'zero-agent-denied-'));
  assert.throws(
    () => localTools.execute('command.listDirectory', { path: denied, depth: 1 }, { ZERO_AGENT_ROOTS: allowed }),
    (error) => error.code === 'PATH_NOT_ALLOWED'
  );
});

test('local tools expose command-provider mutation parity and canonical names', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'zero-agent-mutate-'));
  const dir = path.join(root, '.zero');
  const file = path.join(dir, 'state.txt');
  const env = { ZERO_AGENT_ROOTS: root };

  const names = localTools.listTools().map((tool) => tool.name);
  for (const name of ['writeFile', 'replaceFile', 'createDirectory', 'deleteFile']) {
    assert.equal(names.includes(name), true);
  }
  assert.equal(names.length, 10);

  const made = localTools.execute('zero.command.createDirectory', { path: dir }, env);
  assert.equal(made.ok, true);
  assert.equal(fs.statSync(dir).isDirectory(), true);

  localTools.execute('command.writeFile', { path: file, content: 'alpha', mode: 'overwrite' }, env);
  localTools.execute('writeFile', { path: file, content: '-beta', mode: 'append' }, env);
  assert.equal(fs.readFileSync(file, 'utf8'), 'alpha-beta');

  const replaced = localTools.execute('zero.command.replaceFile', {
    path: file, oldString: 'beta', newString: 'gamma', expectedReplacements: 1
  }, env);
  assert.equal(replaced.replacements, 1);
  assert.equal(fs.readFileSync(file, 'utf8'), 'alpha-gamma');

  const deleted = localTools.execute('zero.command.deleteFile', { path: file }, env);
  assert.equal(deleted.deleted, true);
  assert.equal(fs.existsSync(file), false);
});

test('mutation tools still reject paths outside ZERO_AGENT_ROOTS', () => {
  const allowed = fs.mkdtempSync(path.join(os.tmpdir(), 'zero-agent-mut-allowed-'));
  const denied = fs.mkdtempSync(path.join(os.tmpdir(), 'zero-agent-mut-denied-'));
  const env = { ZERO_AGENT_ROOTS: allowed };

  assert.throws(
    () => localTools.execute('createDirectory', { path: path.join(denied, '.zero') }, env),
    (error) => error.code === 'PATH_NOT_ALLOWED'
  );
  assert.throws(
    () => localTools.execute('writeFile', { path: path.join(denied, 'x.txt'), content: 'x' }, env),
    (error) => error.code === 'PATH_NOT_ALLOWED'
  );
});
