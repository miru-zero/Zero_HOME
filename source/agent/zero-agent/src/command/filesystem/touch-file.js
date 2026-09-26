'use strict';

const fs = require('node:fs');
const path = require('node:path');
const zero = require('../../zero-runtime');
const pathPolicy = require('./path-policy');

const descriptor = zero.descriptor.validate({
  name: 'zero.command.filesystem.touchFile',
  aliases: ['zero.command.touchFile'],
  description: 'Create or update a file timestamp inside allowed roots.',
  capability: 'filesystem.write',
  risk: 'write',
  execution: 'target',
  adapters: ['native'],
  inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'], additionalProperties: false }
});

const touchFile = (args = {}, context = {}) => {
  const file = pathPolicy.resolveAllowed(args.path, context);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (!fs.existsSync(file)) fs.closeSync(fs.openSync(file, 'w'));
  const now = new Date();
  fs.utimesSync(file, now, now);
  return { ok: true, path: file, touched: true };
};

const touchFileModule = { descriptor, touchFile };
Object.assign(exports, touchFileModule);
