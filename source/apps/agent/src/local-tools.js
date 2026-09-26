'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const textDecoder = new TextDecoder('utf-8', { fatal: false });
const err = (code, message) => Object.assign(new Error(message), { code });
const normalize = (value) => path.resolve(String(value)).toLowerCase();

const rootsFor = (env = process.env) => {
  const configured = String(env.ZERO_AGENT_ROOTS || '')
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean);
  const roots = configured.length ? configured : [os.homedir(), process.cwd()];
  return roots.map((item) => path.resolve(item));
};

const resolveAllowed = (inputPath, env = process.env) => {
  if (!inputPath || typeof inputPath !== 'string') throw err('INVALID_PATH', 'path is required');
  const roots = rootsFor(env);
  const target = path.resolve(inputPath);
  const targetNorm = normalize(target);
  const ok = roots.some((root) => {
    const rootNorm = normalize(root);
    return targetNorm === rootNorm || targetNorm.startsWith(rootNorm + path.sep.toLowerCase());
  });
  if (!ok) throw err('PATH_NOT_ALLOWED', 'path is outside agent allowed roots');
  return target;
};

const readUtf8 = (file) => {
  const data = fs.readFileSync(file);
  if (data.includes(0)) throw err('BINARY_FILE', 'binary file is not supported');
  return textDecoder.decode(data);
};

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
  .replace(/\*/g, '.*').replace(/\?/g, '.') + '$', 'i');

const numbered = (lines, startIndex) => lines
  .map((line, index) => String(startIndex + index + 1).padStart(4, ' ') + '\t' + line)
  .join('\n');

const listDirectory = (args, env) => {
  const root = resolveAllowed(args.path, env);
  const depth = Math.max(1, Math.min(args.depth || 2, 5));
  return { ok: true, path: root, depth, entries: walk(root, { depth }) };
};

const getFileInfo = (args, env) => {
  const target = resolveAllowed(args.path, env);
  const stat = fs.statSync(target);
  return {
    ok: true,
    path: target,
    type: stat.isDirectory() ? 'directory' : 'file',
    size: stat.size,
    createdAt: stat.birthtime.toISOString(),
    modifiedAt: stat.mtime.toISOString(),
    lineCount: stat.isFile() ? readUtf8(target).split(/\r?\n/).length : null
  };
};

const readFile = (args, env) => {
  const file = resolveAllowed(args.path, env);
  const lines = readUtf8(file).split(/\r?\n/);
  const offset = Number.isInteger(args.offset) ? args.offset : 0;
  const length = Number.isInteger(args.length) ? args.length : 200;
  const start = offset < 0 ? Math.max(lines.length + offset, 0) : Math.max(offset, 0);
  const slice = lines.slice(start, start + length);
  return { ok: true, path: file, totalLines: lines.length, offset: start, length: slice.length, content: numbered(slice, start) };
};

const readFiles = (args = {}, env) => {
  const requests = Array.isArray(args.files) && args.files.length
    ? args.files.map((item) => ({ path: item.path, offset: item.offset, length: item.length }))
    : (Array.isArray(args.paths) ? args.paths : []).map((inputPath) => ({ path: inputPath, offset: args.offset, length: args.length }));
  if (!requests.length) throw err('INVALID_PATHS', 'paths or files must contain at least one file');
  if (requests.length > 50) throw err('TOO_MANY_PATHS', 'readFiles supports up to 50 files');
  const files = requests.map((request) => {
    try { return readFile(request, env); }
    catch (error) { return { ok: false, path: String(request.path), error: { code: error.code || 'READ_FAILED', message: error.message || String(error) } }; }
  });
  const succeeded = files.filter((item) => item.ok).length;
  return { ok: succeeded === files.length, count: files.length, succeeded, failed: files.length - succeeded, files };
};

const writeFile = (args, env) => {
  const file = resolveAllowed(args.path, env);
  const mode = args.mode === 'append' ? 'append' : 'overwrite';
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const data = String(args.content ?? '');
  if (mode === 'append') fs.appendFileSync(file, data, 'utf8');
  else fs.writeFileSync(file, data, 'utf8');
  return { ok: true, path: file, mode, bytes: Buffer.byteLength(data) };
};

const replaceFile = (args, env) => {
  const file = resolveAllowed(args.path, env);
  const oldString = String(args.oldString ?? '');
  if (!oldString) throw err('INVALID_REPLACE', 'oldString must not be empty');
  const newString = String(args.newString ?? '');
  const text = readUtf8(file);
  const replacements = text.split(oldString).length - 1;
  if (Number.isInteger(args.expectedReplacements) && replacements !== args.expectedReplacements) {
    throw err('REPLACE_COUNT_MISMATCH', `expected ${args.expectedReplacements} replacements, got ${replacements}`);
  }
  fs.writeFileSync(file, text.split(oldString).join(newString), 'utf8');
  return { ok: true, path: file, replacements };
};

const createDirectory = (args, env) => {
  const dir = resolveAllowed(args.path, env);
  fs.mkdirSync(dir, { recursive: true });
  return { ok: true, path: dir, created: fs.existsSync(dir) && fs.statSync(dir).isDirectory() };
};

const deleteFile = (args, env) => {
  const file = resolveAllowed(args.path, env);
  if (!fs.existsSync(file)) throw err('FILE_NOT_FOUND', 'file does not exist');
  const stat = fs.statSync(file);
  if (!stat.isFile()) throw err('NOT_A_FILE', 'deleteFile supports files only');
  fs.unlinkSync(file);
  return { ok: true, path: file, deleted: true };
};

const globFiles = (args, env) => {
  const root = resolveAllowed(args.path, env);
  const rx = wildcard(args.pattern || '*');
  const max = Math.max(1, Math.min(args.maxResults || 200, 1000));
  const files = walk(root, { filesOnly: true })
    .filter((item) => rx.test(path.basename(item.path)) || rx.test(item.relativePath))
    .slice(0, max);
  return { ok: true, path: root, pattern: args.pattern, files };
};

const grepFiles = (args, env) => {
  const root = resolveAllowed(args.path, env);
  const max = Math.max(1, Math.min(args.maxResults || 200, 1000));
  const rx = args.literal ? null : new RegExp(String(args.pattern), 'i');
  const fileRx = args.filePattern ? wildcard(args.filePattern) : null;
  const matches = [];
  for (const file of walk(root, { filesOnly: true })) {
    if (fileRx && !fileRx.test(path.basename(file.path)) && !fileRx.test(file.relativePath)) continue;
    let text;
    try { text = readUtf8(file.path); } catch { continue; }
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

const handlers = { readFile, readFiles, writeFile, replaceFile, createDirectory, deleteFile, listDirectory, getFileInfo, globFiles, grepFiles };

const schemaObject = (properties, required = []) => ({ type: 'object', properties, required });
const toolSchemas = [
  { name: 'listDirectory', description: 'List files and folders inside ZERO_AGENT_ROOTS.', inputSchema: schemaObject({ path: { type: 'string' }, depth: { type: 'number' } }, ['path']) },
  { name: 'getFileInfo', description: 'Get metadata for a file or directory inside ZERO_AGENT_ROOTS.', inputSchema: schemaObject({ path: { type: 'string' } }, ['path']) },
  { name: 'readFile', description: 'Read a UTF-8 text file inside ZERO_AGENT_ROOTS with line pagination.', inputSchema: schemaObject({ path: { type: 'string' }, offset: { type: 'number' }, length: { type: 'number' } }, ['path']) },
  { name: 'readFiles', description: 'Read multiple UTF-8 text files inside ZERO_AGENT_ROOTS. Accept paths[] or files[].', inputSchema: schemaObject({ paths: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 50 }, files: { type: 'array', minItems: 1, maxItems: 50, items: schemaObject({ path: { type: 'string' }, offset: { type: 'number' }, length: { type: 'number' } }, ['path']) }, offset: { type: 'number' }, length: { type: 'number' } }) },
  { name: 'writeFile', description: 'Write or append a UTF-8 text file inside ZERO_AGENT_ROOTS.', inputSchema: schemaObject({ path: { type: 'string' }, content: { type: 'string' }, mode: { type: 'string', enum: ['overwrite', 'append'] } }, ['path', 'content']) },
  { name: 'replaceFile', description: 'Replace exact text inside a UTF-8 file in ZERO_AGENT_ROOTS.', inputSchema: schemaObject({ path: { type: 'string' }, oldString: { type: 'string' }, newString: { type: 'string' }, expectedReplacements: { type: 'number' } }, ['path', 'oldString', 'newString']) },
  { name: 'createDirectory', description: 'Create a directory recursively inside ZERO_AGENT_ROOTS.', inputSchema: schemaObject({ path: { type: 'string' } }, ['path']) },
  { name: 'deleteFile', description: 'Delete one file inside ZERO_AGENT_ROOTS. Directories are rejected.', inputSchema: schemaObject({ path: { type: 'string' } }, ['path']) },
  { name: 'globFiles', description: 'Find files by wildcard pattern inside ZERO_AGENT_ROOTS.', inputSchema: schemaObject({ path: { type: 'string' }, pattern: { type: 'string' }, maxResults: { type: 'number' } }, ['path']) },
  { name: 'grepFiles', description: 'Search text files inside ZERO_AGENT_ROOTS.', inputSchema: schemaObject({ path: { type: 'string' }, pattern: { type: 'string' }, literal: { type: 'boolean' }, filePattern: { type: 'string' }, maxResults: { type: 'number' } }, ['path', 'pattern']) }
];

const execute = (tool, args = {}, env = process.env) => {
  const cleanTool = String(tool || '').replace(/^zero\.command\./, '').replace(/^command\./, '');
  const handler = handlers[cleanTool];
  if (!handler) throw err('UNKNOWN_AGENT_TOOL', 'unknown or unsafe agent tool: ' + tool);
  return handler(args, env);
};
const listTools = () => toolSchemas.map((tool) => ({ ...tool }));

const localTools = { execute, listTools, _private: { rootsFor, resolveAllowed, wildcard } };
Object.assign(exports, localTools);
