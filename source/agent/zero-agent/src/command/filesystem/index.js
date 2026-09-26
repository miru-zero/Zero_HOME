'use strict';

const readFileModule = require('./read-file');
const readFilesModule = require('./read-files');
const listDirectoryModule = require('./list-directory');

const filesystem = {
  readFile: readFileModule.readFile,
  readFileDescriptor: readFileModule.descriptor,
  readFiles: readFilesModule.readFiles,
  readFilesDescriptor: readFilesModule.descriptor,
  listDirectory: listDirectoryModule.listDirectory,
  listDirectoryDescriptor: listDirectoryModule.descriptor
};

Object.assign(exports, filesystem);
