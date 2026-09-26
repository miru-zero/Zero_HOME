'use strict';

const SEGMENT = /^[A-Za-z][A-Za-z0-9_-]*$/;
const invalid = (value) => Object.assign(
  new Error('invalid Zero tool id: ' + String(value)),
  { code: 'INVALID_TOOL_ID' }
);
const assertSegment = (value) => {
  if (!SEGMENT.test(String(value || ''))) throw invalid(value);
  return String(value);
};
const toolId = {
  format: ({ provider, category, function: functionName } = {}) => {
    const p = assertSegment(provider);
    const c = assertSegment(category);
    const f = assertSegment(functionName);
    return `zero.${p}.${c}.${f}`;
  },
  parse: (name) => {
    const parts = String(name || '').split('.');
    if (parts.length !== 4 || parts[0] !== 'zero') throw invalid(name);
    const provider = assertSegment(parts[1]);
    const category = assertSegment(parts[2]);
    const functionName = assertSegment(parts[3]);
    return { provider, category, function: functionName, name: `zero.${provider}.${category}.${functionName}` };
  }
};

Object.assign(exports, toolId);
