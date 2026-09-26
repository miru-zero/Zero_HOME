'use strict';

const readFileModule = require('./read-file');
const readFilesModule = require('./read-files');
const listDirectoryModule = require('./list-directory');
const getFileInfoModule = require('./get-file-info');
const globFilesModule = require('./glob-files');
const grepFilesModule = require('./grep-files');

const filesystem = {
  readFile: readFileModule.readFile,
  readFileDescriptor: readFileModule.descriptor,
  readFiles: readFilesModule.readFiles,
  readFilesDescriptor: readFilesModule.descriptor,
  listDirectory: listDirectoryModule.listDirectory,
  listDirectoryDescriptor: listDirectoryModule.descriptor,
  getFileInfo: getFileInfoModule.getFileInfo,
  getFileInfoDescriptor: getFileInfoModule.descriptor,
  globFiles: globFilesModule.globFiles,
  globFilesDescriptor: globFilesModule.descriptor,
  grepFiles: grepFilesModule.grepFiles,
  grepFilesDescriptor: grepFilesModule.descriptor
};

Object.assign(exports, filesystem);
