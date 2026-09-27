'use strict';

const path = require('node:path');
const zero = require('../../zero-runtime');
const pathPolicy = require('./path-policy');
const walk = require('./walk');

const descriptor = zero.descriptor.validate({
  name: 'zero.command.filesystem.globFiles',
  aliases: ['zero.command.globFiles'],
  description: 'Find files by wildcard pattern inside allowed roots.',
  capability: 'filesystem.read',
  risk: 'read',
  execution: 'target',
  adapters: ['native'],
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string' },
      pattern: { type: 'string' },
      maxResults: { type: 'integer', minimum: 1, maximum: 1000, default: 200 }
    },
    required: ['path', 'pattern'],
    additionalProperties: false
  }
});

const globFiles = (args = {}, context = {}) => {
  const root = pathPolicy.resolveAllowed(args.path, context);
  const rx = walk.wildcard(args.pattern || '*');
  const max = Math.max(1, Math.min(args.maxResults || 200, 1000));
  const files = walk.walk(root, { filesOnly: true })
    .filter((item) => rx.test(path.basename(item.path)) || rx.test(item.relativePath))
    .slice(0, max);
  return { ok: true, path: root, pattern: args.pattern, files };
};

const globFilesModule = { descriptor, globFiles };
Object.assign(exports, globFilesModule);
