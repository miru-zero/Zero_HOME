'use strict';

const fs = require('node:fs');
const zero = require('../../zero-runtime');
const pathPolicy = require('./path-policy');
const textModule = require('./text');

const descriptor = zero.descriptor.validate({
  name: 'zero.command.filesystem.replaceFile',
  aliases: ['zero.command.replaceFile'],
  description: 'Replace exact text inside a UTF-8 file in allowed roots.',
  capability: 'filesystem.write',
  risk: 'write',
  execution: 'target',
  adapters: ['native'],
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string' },
      oldString: { type: 'string' },
      newString: { type: 'string' },
      expectedReplacements: { type: 'integer', minimum: 0 }
    },
    required: ['path', 'oldString', 'newString'],
    additionalProperties: false
  }
});

const fail = (code, message) => Object.assign(new Error(message), { code });
const replaceFile = (args = {}, context = {}) => {
  const file = pathPolicy.resolveAllowed(args.path, context);
  const oldString = String(args.oldString ?? '');
  if (!oldString) throw fail('INVALID_REPLACE', 'oldString must not be empty');
  const newString = String(args.newString ?? '');
  const text = textModule.readUtf8(file);
  const replacements = text.split(oldString).length - 1;
  if (Number.isInteger(args.expectedReplacements) && replacements !== args.expectedReplacements) {
    throw fail('REPLACE_COUNT_MISMATCH', `expected ${args.expectedReplacements} replacements, got ${replacements}`);
  }
  fs.writeFileSync(file, text.split(oldString).join(newString), 'utf8');
  return { ok: true, path: file, replacements };
};

const replaceFileModule = { descriptor, replaceFile };
Object.assign(exports, replaceFileModule);
