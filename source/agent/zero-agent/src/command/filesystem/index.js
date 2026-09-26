'use strict';

const readFileModule = require('./read-file');

const filesystem = {
  readFile: readFileModule.readFile,
  readFileDescriptor: readFileModule.descriptor
};

Object.assign(exports, filesystem);
