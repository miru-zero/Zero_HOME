'use strict';

const fs = require('node:fs');

const textDecoder = new TextDecoder('utf-8', { fatal: false });
const err = (code, message) => Object.assign(new Error(message), { code });
const readUtf8 = (file) => {
  const data = fs.readFileSync(file);
  if (data.includes(0)) throw err('BINARY_FILE', 'binary file is not supported');
  return textDecoder.decode(data);
};
const numbered = (lines, startIndex) => lines
  .map((line, index) => String(startIndex + index + 1).padStart(4, ' ') + '\t' + line)
  .join('\n');

const text = { readUtf8, numbered };
Object.assign(exports, text);
