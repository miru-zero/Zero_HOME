'use strict';

const fs = require('node:fs');
const zero = require('../../zero-runtime');
const pathPolicy = require('./path-policy');

const descriptor = zero.descriptor.validate({
  name: 'zero.command.filesystem.exists',
  aliases: ['zero.command.exists'],
  description: 'Check whether a path exists inside allowed roots.',
  capability: 'filesystem.read',
  risk: 'read',
  execution: 'target',
  adapters: ['native'],
  inputSchema: {
    type: 'object',
    properties: { path: { type: 'string' } },
    required: ['path'],
    additionalProperties: false
  }
});

const exists = (args = {}, context = {}) => {
  const pathValue = pathPolicy.resolveAllowed(args.path, context);
  return { ok: true, path: pathValue, exists: fs.existsSync(pathValue) };
};

const existsModule = { descriptor, exists };
Object.assign(exports, existsModule);
