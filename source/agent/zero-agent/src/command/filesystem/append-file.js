'use strict';

const fs = require('node:fs');
const path = require('node:path');
const zero = require('../../zero-runtime');
const pathPolicy = require('./path-policy');

const descriptor = zero.descriptor.validate({
  name: 'zero.command.filesystem.appendFile',
  aliases: ['zero.command.appendFile'],
  description: 'Append UTF-8 text content to a file inside allowed roots.',
  capability: 'filesystem.write',
  risk: 'write',
  execution: 'target',
  adapters: ['native'],
  inputSchema: {
    type: 'object',
    properties: { path: { type: 'string' }, content: { type: 'string' } },
    required: ['path', 'content'],
    additionalProperties: false
  }
});

const appendFile = (args = {}, context = {}) => {
  const file = pathPolicy.resolveAllowed(args.path, context);
  const data = String(args.content ?? '');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, data, 'utf8');
  return { ok: true, path: file, mode: 'append', bytes: Buffer.byteLength(data) };
};

const appendFileModule = { descriptor, appendFile };
Object.assign(exports, appendFileModule);
