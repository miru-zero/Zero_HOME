'use strict';

const fs = require('node:fs');
const path = require('node:path');

const entry = (fullPath, root) => {
  const stat = fs.statSync(fullPath);
  return {
    path: fullPath,
    relativePath: path.relative(root, fullPath).replace(/\\/g, '/'),
    type: stat.isDirectory() ? 'directory' : 'file',
    size: stat.size
  };
};

const walk = (root, options = {}) => {
  const depth = options.depth ?? Infinity;
  const filesOnly = options.filesOnly === true;
  const out = [];
  const visit = (dir, level) => {
    if (level > depth) return;
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      const item = entry(full, root);
      if (!filesOnly || item.type === 'file') out.push(item);
      if (item.type === 'directory') visit(full, level + 1);
    }
  };
  visit(root, 1);
  return out;
};

const wildcard = (pattern) => new RegExp('^' + String(pattern)
  .replace(/[.+^${}()|[\]\\]/g, '\\$&')
  .replace(/\*/g, '.*')
  .replace(/\?/g, '.') + '$', 'i');

const walkModule = { entry, walk, wildcard };
Object.assign(exports, walkModule);
