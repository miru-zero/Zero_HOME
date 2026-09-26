'use strict';

const fs = require('node:fs');
const zero = require('../../zero-runtime');
const pathPolicy = require('./path-policy');

const descriptor = zero.descriptor.validate({
  name: 'zero.command.filesystem.deleteDirectory',
  aliases: ['zero.command.deleteDirectory'],
  description: 'Delete a directory inside allowed roots.',
  capability: 'filesystem.write',
  risk: 'write',
  execution: 'target',
  adapters: ['native'],
  inputSchema: { type: 'object', properties: { path: { type: 'string' }, recursive: { type: 'boolean', default: false } }, required: ['path'], additionalProperties: false }
});

const fail = (code, message) => Object.assign(new Error(message), { code });
const deleteDirectory = (args = {}, context = {}) => {
  const dir = pathPolicy.resolveAllowed(args.path, context);
  if (!fs.statSync(dir).isDirectory()) throw fail('NOT_A_DIRECTORY', 'path is not a directory');
  fs.rmSync(dir, { recursive: args.recursive === true, force: false });
  return { ok: true, path: dir, deleted: true };
};

const deleteDirectoryModule = { descriptor, deleteDirectory };
Object.assign(exports, deleteDirectoryModule);
