'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const zero = require('../../zero-runtime');
const pathPolicy = require('./path-policy');

const descriptor = zero.descriptor.validate({
  name: 'zero.command.filesystem.hashFile',
  aliases: ['zero.command.hashFile'],
  description: 'Calculate SHA-256 hash of a file inside allowed roots.',
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

const hashFile = (args = {}, context = {}) => {
  const file = pathPolicy.resolveAllowed(args.path, context);
  return {
    ok: true,
    path: file,
    algorithm: 'sha256',
    hash: crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
  };
};

const hashFileModule = { descriptor, hashFile };
Object.assign(exports, hashFileModule);
