'use strict';

const modules = {
  readFile: require('./read-file'),
  readFiles: require('./read-files'),
  listDirectory: require('./list-directory'),
  getFileInfo: require('./get-file-info'),
  globFiles: require('./glob-files'),
  grepFiles: require('./grep-files'),
  writeFile: require('./write-file'),
  appendFile: require('./append-file'),
  createFile: require('./create-file'),
  touchFile: require('./touch-file'),
  replaceFile: require('./replace-file'),
  createDirectory: require('./create-directory'),
  deleteFile: require('./delete-file'),
  copyDirectory: require('./copy-directory'),
  moveDirectory: require('./move-directory'),
  deleteDirectory: require('./delete-directory'),
  truncateFile: require('./truncate-file'),
  copyFile: require('./copy-file'),
  moveFile: require('./move-file'),
  renameFile: require('./rename-file'),
  exists: require('./exists'),
  hashFile: require('./hash-file')
};

const filesystem = {};
for (const [name, item] of Object.entries(modules)) {
  filesystem[name] = item[name];
  filesystem[`${name}Descriptor`] = item.descriptor;
}

Object.assign(exports, filesystem);
