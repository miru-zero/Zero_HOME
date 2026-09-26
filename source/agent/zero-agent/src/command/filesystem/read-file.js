'use strict';

const zero = require('../../zero-runtime');
const pathPolicy = require('./path-policy');
const text = require('./text');

const descriptor = zero.descriptor.validate({
  name: 'zero.command.filesystem.readFile',
  aliases: ['zero.command.readFile'],
  description: 'Read a UTF-8 text file inside allowed roots with line pagination.',
  capability: 'filesystem.read',
  risk: 'read',
  execution: 'target',
  adapters: ['native'],
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string' },
      offset: { type: 'integer', default: 0 },
      length: { type: 'integer', minimum: 1, maximum: 1000, default: 200 }
    },
    required: ['path'],
    additionalProperties: false
  }
});
const readFile = (args = {}, context = {}) => {
  const file = pathPolicy.resolveAllowed(args.path, context);
  const lines = text.readUtf8(file).split(/\r?\n/);
  const offset = Number.isInteger(args.offset) ? args.offset : 0;
  const length = Number.isInteger(args.length) ? args.length : 200;
  const start = offset < 0 ? Math.max(lines.length + offset, 0) : Math.max(offset, 0);
  const slice = lines.slice(start, start + length);
  return { ok: true, path: file, totalLines: lines.length, offset: start, length: slice.length, content: text.numbered(slice, start) };
};

const readFileModule = { descriptor, readFile };
Object.assign(exports, readFileModule);
