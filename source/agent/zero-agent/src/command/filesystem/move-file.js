'use strict';

const fs = require('node:fs');
const path = require('node:path');
const zero = require('../../zero-runtime');
const pathPolicy = require('./path-policy');

const descriptor = zero.descriptor.validate({
  name: 'zero.command.filesystem.moveFile',
  aliases: ['zero.command.moveFile'],
  description: 'Move one file or directory inside allowed roots.',
  capability: 'filesystem.write',
  risk: 'write',
  execution: 'target',
  adapters: ['native'],
  inputSchema: {
    type: 'object',
    properties: { source: { type: 'string' }, destination: { type: 'string' } },
    required: ['source', 'destination'],
    additionalProperties: false
  }
});

const moveFile = (args = {}, context = {}) => {
  const source = pathPolicy.resolveAllowed(args.source, context);
  const destination = pathPolicy.resolveAllowed(args.destination, context);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.renameSync(source, destination);
  return { ok: true, source, destination };
};

const moveFileModule = { descriptor, moveFile };
Object.assign(exports, moveFileModule);
