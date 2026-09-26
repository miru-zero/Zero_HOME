'use strict';

const fs = require('node:fs');
const path = require('node:path');
const zero = require('../../zero-runtime');
const pathPolicy = require('./path-policy');

const descriptor = zero.descriptor.validate({
  name: 'zero.command.filesystem.writeFile',
  aliases: ['zero.command.writeFile'],
  description: 'Write or append text content to a file inside allowed roots.',
  capability: 'filesystem.write',
  risk: 'write',
  execution: 'target',
  adapters: ['native'],
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string' },
      content: { type: 'string' },
      mode: { type: 'string', enum: ['overwrite', 'append'], default: 'overwrite' }
    },
    required: ['path', 'content'],
    additionalProperties: false
  }
});

const writeFile = (args = {}, context = {}) => {
  const file = pathPolicy.resolveAllowed(args.path, context);
  const mode = args.mode === 'append' ? 'append' : 'overwrite';
  const data = String(args.content ?? '');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (mode === 'append') fs.appendFileSync(file, data, 'utf8');
  else fs.writeFileSync(file, data, 'utf8');
  return { ok: true, path: file, mode, bytes: Buffer.byteLength(data) };
};

const writeFileModule = { descriptor, writeFile };
Object.assign(exports, writeFileModule);
