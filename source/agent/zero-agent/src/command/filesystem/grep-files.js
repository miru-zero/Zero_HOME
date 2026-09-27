'use strict';

const path = require('node:path');
const zero = require('../../zero-runtime');
const pathPolicy = require('./path-policy');
const textModule = require('./text');
const walk = require('./walk');

const descriptor = zero.descriptor.validate({
  name: 'zero.command.filesystem.grepFiles',
  aliases: ['zero.command.grepFiles'],
  description: 'Search text content in files inside allowed roots.',
  capability: 'filesystem.read',
  risk: 'read',
  execution: 'target',
  adapters: ['native'],
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string' },
      pattern: { type: 'string' },
      literal: { type: 'boolean', default: false },
      filePattern: { type: 'string' },
      maxResults: { type: 'integer', minimum: 1, maximum: 1000, default: 200 }
    },
    required: ['path', 'pattern'],
    additionalProperties: false
  }
});

const grepFiles = (args = {}, context = {}) => {
  const root = pathPolicy.resolveAllowed(args.path, context);
  const max = Math.max(1, Math.min(args.maxResults || 200, 1000));
  const rx = args.literal ? null : new RegExp(String(args.pattern), 'i');
  const fileRx = args.filePattern ? walk.wildcard(args.filePattern) : null;
  const matches = [];
  for (const file of walk.walk(root, { filesOnly: true })) {
    if (fileRx && !fileRx.test(path.basename(file.path)) && !fileRx.test(file.relativePath)) continue;
    let text;
    try { text = textModule.readUtf8(file.path); } catch { continue; }
    const lines = text.split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const hit = args.literal ? line.includes(String(args.pattern)) : rx.test(line);
      if (!hit) continue;
      matches.push({ path: file.path, relativePath: file.relativePath, line: index + 1, text: line });
      if (matches.length >= max) return { ok: true, path: root, pattern: args.pattern, matches };
    }
  }
  return { ok: true, path: root, pattern: args.pattern, matches };
};

const grepFilesModule = { descriptor, grepFiles };
Object.assign(exports, grepFilesModule);
