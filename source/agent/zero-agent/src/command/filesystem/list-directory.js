'use strict';

const zero = require('../../zero-runtime');
const pathPolicy = require('./path-policy');
const walk = require('./walk');

const descriptor = zero.descriptor.validate({
  name: 'zero.command.filesystem.listDirectory',
  aliases: ['zero.command.listDirectory'],
  description: 'List files and directories recursively inside allowed roots.',
  capability: 'filesystem.read',
  risk: 'read',
  execution: 'target',
  adapters: ['native'],
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string' },
      depth: { type: 'integer', minimum: 1, maximum: 5, default: 2 }
    },
    required: ['path'],
    additionalProperties: false
  }
});

const listDirectory = (args = {}, context = {}) => {
  const root = pathPolicy.resolveAllowed(args.path, context);
  const depth = Math.max(1, Math.min(args.depth || 2, 5));
  return { ok: true, path: root, depth, entries: walk.walk(root, { depth }) };
};

const listDirectoryModule = { descriptor, listDirectory };
Object.assign(exports, listDirectoryModule);
