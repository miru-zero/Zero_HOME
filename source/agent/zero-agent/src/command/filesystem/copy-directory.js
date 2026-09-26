'use strict';

const fs = require('node:fs');
const zero = require('../../zero-runtime');
const pathPolicy = require('./path-policy');

const descriptor = zero.descriptor.validate({
  name: 'zero.command.filesystem.copyDirectory',
  aliases: ['zero.command.copyDirectory'],
  description: 'Copy a directory recursively inside allowed roots.',
  capability: 'filesystem.write',
  risk: 'write',
  execution: 'target',
  adapters: ['native'],
  inputSchema: {
    type: 'object',
    properties: { source: { type: 'string' }, destination: { type: 'string' }, overwrite: { type: 'boolean', default: false } },
    required: ['source', 'destination'],
    additionalProperties: false
  }
});

const fail = (code, message) => Object.assign(new Error(message), { code });
const copyDirectory = (args = {}, context = {}) => {
  const source = pathPolicy.resolveAllowed(args.source, context);
  const destination = pathPolicy.resolveAllowed(args.destination, context);
  if (!fs.statSync(source).isDirectory()) throw fail('NOT_A_DIRECTORY', 'source is not a directory');
  fs.cpSync(source, destination, { recursive: true, force: args.overwrite === true, errorOnExist: args.overwrite !== true });
  return { ok: true, source, destination };
};

const copyDirectoryModule = { descriptor, copyDirectory };
Object.assign(exports, copyDirectoryModule);
