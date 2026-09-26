'use strict';

const path = require('node:path');
const zero = require('../../zero-runtime');

const descriptor = (name, description, properties, required = []) => zero.descriptor.validate({
  name: `zero.command.path.${name}`,
  aliases: [`zero.command.${name}`],
  description,
  capability: 'path.compute',
  risk: 'read',
  execution: 'target',
  adapters: ['native'],
  inputSchema: { type: 'object', properties, required, additionalProperties: false }
});

const resolvePathDescriptor = descriptor('resolvePath', 'Resolve a path against an optional base path.', {
  path: { type: 'string' }, base: { type: 'string' }
}, ['path']);
const normalizePathDescriptor = descriptor('normalizePath', 'Normalize a path string for the target platform.', {
  path: { type: 'string' }
}, ['path']);
const joinPathDescriptor = descriptor('joinPath', 'Join path segments for the target platform.', {
  segments: { type: 'array', items: { type: 'string' }, minItems: 1 }
}, ['segments']);
const relativePathDescriptor = descriptor('relativePath', 'Compute a relative path between two paths.', {
  from: { type: 'string' }, to: { type: 'string' }
}, ['from', 'to']);
const getParentDirectoryDescriptor = descriptor('getParentDirectory', 'Return the parent directory name for a path.', {
  path: { type: 'string' }
}, ['path']);
const getFilenameDescriptor = descriptor('getFilename', 'Return the filename portion of a path.', {
  path: { type: 'string' }, stripExtension: { type: 'boolean', default: false }
}, ['path']);
const getExtensionDescriptor = descriptor('getExtension', 'Return the extension portion of a path.', {
  path: { type: 'string' }
}, ['path']);

const asText = (value) => String(value ?? '');
const resolvePath = (args = {}) => ({ ok: true, path: args.base ? path.resolve(asText(args.base), asText(args.path)) : path.resolve(asText(args.path)) });
const normalizePath = (args = {}) => ({ ok: true, path: path.normalize(asText(args.path)) });
const joinPath = (args = {}) => ({ ok: true, path: path.join(...(Array.isArray(args.segments) ? args.segments.map(asText) : [])) });
const relativePath = (args = {}) => ({ ok: true, path: path.relative(asText(args.from), asText(args.to)) });
const getParentDirectory = (args = {}) => ({ ok: true, path: path.dirname(asText(args.path)) });
const getFilename = (args = {}) => ({ ok: true, name: path.basename(asText(args.path), args.stripExtension ? path.extname(asText(args.path)) : undefined) });
const getExtension = (args = {}) => ({ ok: true, extension: path.extname(asText(args.path)) });

const pathTools = {
  resolvePathDescriptor, normalizePathDescriptor, joinPathDescriptor, relativePathDescriptor,
  getParentDirectoryDescriptor, getFilenameDescriptor, getExtensionDescriptor,
  resolvePath, normalizePath, joinPath, relativePath, getParentDirectory, getFilename, getExtension
};
Object.assign(exports, pathTools);
