'use strict';

const zero = require('../zero-runtime');
const filesystem = require('./filesystem');

const catalog = zero.catalog.create([filesystem.readFileDescriptor]);
const handlers = new Map([[filesystem.readFileDescriptor.name, filesystem.readFile]]);
const localAlias = (name) => {
  if (name === 'readFile' || name === 'command.readFile') return 'zero.command.readFile';
  return name;
};
const command = {
  filesystem: { readFile: filesystem.readFile },
  listTools: (filter = {}) => catalog.list(filter),
  resolveTool: (name) => catalog.resolve(localAlias(name)),
  callTool: (name, args = {}, context = {}) => {
    const descriptor = catalog.resolve(localAlias(name));
    const handler = handlers.get(descriptor.name);
    return handler(args, context);
  }
};

Object.assign(exports, command);
