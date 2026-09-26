'use strict';

const fs = require('node:fs');
const zero = require('../../zero-runtime');
const pathPolicy = require('./path-policy');
const text = require('./text');

const descriptor = zero.descriptor.validate({
  name: 'zero.command.filesystem.getFileInfo',
  aliases: ['zero.command.getFileInfo'],
  description: 'Get metadata for a file or directory inside allowed roots.',
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
const getFileInfo = (args = {}, context = {}) => {
  const target = pathPolicy.resolveAllowed(args.path, context);
  const stat = fs.statSync(target);
  return {
    ok: true,
    path: target,
    type: stat.isDirectory() ? 'directory' : 'file',
    size: stat.size,
    createdAt: stat.birthtime.toISOString(),
    modifiedAt: stat.mtime.toISOString(),
    lineCount: stat.isFile() ? text.readUtf8(target).split(/\r?\n/).length : null
  };
};

const getFileInfoModule = { descriptor, getFileInfo };
Object.assign(exports, getFileInfoModule);
