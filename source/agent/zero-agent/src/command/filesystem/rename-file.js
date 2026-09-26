'use strict';

const zero = require('../../zero-runtime');
const moveFileModule = require('./move-file');

const descriptor = zero.descriptor.validate({
  name: 'zero.command.filesystem.renameFile',
  aliases: ['zero.command.renameFile'],
  description: 'Rename one file or directory inside allowed roots.',
  capability: 'filesystem.write',
  risk: 'write',
  execution: 'target',
  adapters: ['native'],
  inputSchema: moveFileModule.descriptor.inputSchema
});

const renameFile = (args = {}, context = {}) => moveFileModule.moveFile(args, context);

const renameFileModule = { descriptor, renameFile };
Object.assign(exports, renameFileModule);
