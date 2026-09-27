'use strict';

const fs = require('node:fs');
const path = require('node:path');
const zero = require('../../zero-runtime');
const pathPolicy = require('./path-policy');

const descriptor = zero.descriptor.validate({
  name: 'zero.command.filesystem.moveDirectory',
  aliases: ['zero.command.moveDirectory'],
  description: 'Move a directory inside allowed roots.',
  capability: 'filesystem.write',
  risk: 'write',
  execution: 'target',
  adapters: ['native'],
  inputSchema: { type: 'object', properties: { source: { type: 'string' }, destination: { type: 'string' } }, required: ['source', 'destination'], additionalProperties: false }
});

const fail = (code, message) => Object.assign(new Error(message), { code });
const moveDirectory = (args = {}, context = {}) => {
  const source = pathPolicy.resolveAllowed(args.source, context);
  const destination = pathPolicy.resolveAllowed(args.destination, context);
  if (!fs.statSync(source).isDirectory()) throw fail('NOT_A_DIRECTORY', 'source is not a directory');
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.renameSync(source, destination);
  return { ok: true, source, destination };
};

const moveDirectoryModule = { descriptor, moveDirectory };
Object.assign(exports, moveDirectoryModule);
