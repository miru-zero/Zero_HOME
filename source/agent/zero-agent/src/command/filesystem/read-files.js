'use strict';

const zero = require('../../zero-runtime');
const readFileModule = require('./read-file');

const descriptor = zero.descriptor.validate({
  name: 'zero.command.filesystem.readFiles',
  aliases: ['zero.command.readFiles'],
  description: 'Read multiple UTF-8 text files inside allowed roots.',
  capability: 'filesystem.read',
  risk: 'read',
  execution: 'target',
  adapters: ['native'],
  inputSchema: {
    type: 'object',
    properties: {
      paths: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 50 },
      files: {
        type: 'array', minItems: 1, maxItems: 50,
        items: {
          type: 'object',
          properties: {
            path: { type: 'string' },
            offset: { type: 'integer' },
            length: { type: 'integer', minimum: 1, maximum: 1000 }
          },
          required: ['path'],
          additionalProperties: false
        }
      },
      offset: { type: 'integer', default: 0 },
      length: { type: 'integer', minimum: 1, maximum: 1000, default: 200 }
    },
    additionalProperties: false
  }
});

const fail = (code, message) => Object.assign(new Error(message), { code });
const readFiles = (args = {}, context = {}) => {
  const requests = Array.isArray(args.files) && args.files.length
    ? args.files.map((item) => ({ path: item.path, offset: item.offset, length: item.length }))
    : (Array.isArray(args.paths) ? args.paths : []).map((path) => ({ path, offset: args.offset, length: args.length }));
  if (!requests.length) throw fail('INVALID_PATHS', 'paths or files must contain at least one file');
  if (requests.length > 50) throw fail('TOO_MANY_PATHS', 'readFiles supports up to 50 files');
  const files = requests.map((request) => {
    try { return readFileModule.readFile(request, context); }
    catch (error) {
      return { ok: false, path: String(request.path), error: { code: error.code || 'READ_FAILED', message: error.message || String(error) } };
    }
  });
  const succeeded = files.filter((item) => item.ok).length;
  return {
    ok: succeeded === files.length,
    count: files.length,
    succeeded,
    failed: files.length - succeeded,
    files
  };
};

const readFilesModule = { descriptor, readFiles };
Object.assign(exports, readFilesModule);
