'use strict';

const fs = require('node:fs');
const path = require('node:path');
const zero = require('../../zero-runtime');
const pathPolicy = require('./path-policy');

const descriptor = zero.descriptor.validate({
  name: 'zero.command.filesystem.createFile',
  aliases: ['zero.command.createFile'],
  description: 'Create a UTF-8 text file inside allowed roots.',
  capability: 'filesystem.write',
  risk: 'write',
  execution: 'target',
  adapters: ['native'],
  inputSchema: {
    type: 'object',
    properties: { path: { type: 'string' }, content: { type: 'string', default: '' }, overwrite: { type: 'boolean', default: false } },
    required: ['path'],
    additionalProperties: false
  }
});

const fail = (code, message) => Object.assign(new Error(message), { code });
const createFile = (args = {}, context = {}) => {
  const file = pathPolicy.resolveAllowed(args.path, context);
  if (fs.existsSync(file) && args.overwrite !== true) throw fail('FILE_EXISTS', 'file already exists');
  const data = String(args.content ?? '');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, data, 'utf8');
  return { ok: true, path: file, created: true, bytes: Buffer.byteLength(data) };
};

const createFileModule = { descriptor, createFile };
Object.assign(exports, createFileModule);
