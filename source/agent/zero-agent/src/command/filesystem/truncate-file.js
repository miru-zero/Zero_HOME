'use strict';

const fs = require('node:fs');
const zero = require('../../zero-runtime');
const pathPolicy = require('./path-policy');

const descriptor = zero.descriptor.validate({
  name: 'zero.command.filesystem.truncateFile',
  aliases: ['zero.command.truncateFile'],
  description: 'Truncate a file to a specific byte size inside allowed roots.',
  capability: 'filesystem.write',
  risk: 'write',
  execution: 'target',
  adapters: ['native'],
  inputSchema: { type: 'object', properties: { path: { type: 'string' }, size: { type: 'integer', minimum: 0, default: 0 } }, required: ['path'], additionalProperties: false }
});

const truncateFile = (args = {}, context = {}) => {
  const file = pathPolicy.resolveAllowed(args.path, context);
  const size = Number.isInteger(args.size) && args.size >= 0 ? args.size : 0;
  fs.truncateSync(file, size);
  return { ok: true, path: file, size };
};

const truncateFileModule = { descriptor, truncateFile };
Object.assign(exports, truncateFileModule);
