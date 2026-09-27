'use strict';

const fs = require('node:fs');
const zero = require('../../zero-runtime');
const pathPolicy = require('./path-policy');

const descriptor = zero.descriptor.validate({
  name: 'zero.command.filesystem.deleteFile',
  aliases: ['zero.command.deleteFile'],
  description: 'Delete one file inside allowed roots. Directories are rejected.',
  capability: 'filesystem.write',
  risk: 'write',
  execution: 'target',
  adapters: ['native'],
  inputSchema: {
    type: 'object',
    properties: { path: { type: 'string' } },
    required: ['path'],
    additionalProperties: false
  }
});

const fail = (code, message) => Object.assign(new Error(message), { code });
const deleteFile = (args = {}, context = {}) => {
  const file = pathPolicy.resolveAllowed(args.path, context);
  if (!fs.existsSync(file)) throw fail('FILE_NOT_FOUND', 'file does not exist');
  if (!fs.statSync(file).isFile()) throw fail('NOT_A_FILE', 'deleteFile supports files only');
  fs.unlinkSync(file);
  return { ok: true, path: file, deleted: true };
};

const deleteFileModule = { descriptor, deleteFile };
Object.assign(exports, deleteFileModule);
