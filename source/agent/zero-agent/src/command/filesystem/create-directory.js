'use strict';

const fs = require('node:fs');
const zero = require('../../zero-runtime');
const pathPolicy = require('./path-policy');

const descriptor = zero.descriptor.validate({
  name: 'zero.command.filesystem.createDirectory',
  aliases: ['zero.command.createDirectory'],
  description: 'Create a directory recursively inside allowed roots.',
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

const createDirectory = (args = {}, context = {}) => {
  const dir = pathPolicy.resolveAllowed(args.path, context);
  fs.mkdirSync(dir, { recursive: true });
  return { ok: true, path: dir, created: fs.existsSync(dir) && fs.statSync(dir).isDirectory() };
};

const createDirectoryModule = { descriptor, createDirectory };
Object.assign(exports, createDirectoryModule);
