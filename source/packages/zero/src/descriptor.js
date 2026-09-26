'use strict';

const toolId = require('./tool-id');
const EXECUTION = new Set(['core', 'target', 'either']);
const bad = (code, message) => Object.assign(new Error(message), { code });
const descriptor = {
  validate: (input) => {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw bad('INVALID_TOOL_DESCRIPTOR', 'tool descriptor must be an object');
    }
    const identity = toolId.parse(input.name);
    if (input.execution && !EXECUTION.has(input.execution)) {
      throw bad('INVALID_TOOL_DESCRIPTOR', 'invalid execution mode: ' + input.execution);
    }
    const aliases = input.aliases === undefined ? [] : input.aliases;
    if (!Array.isArray(aliases) || aliases.some((item) => typeof item !== 'string' || !item.trim())) {
      throw bad('INVALID_TOOL_DESCRIPTOR', 'aliases must be non-empty strings');
    }
    return {
      ...input,
      ...identity,
      aliases: [...new Set(aliases)],
      inputSchema: input.inputSchema || { type: 'object', properties: {}, additionalProperties: false }
    };
  }
};

Object.assign(exports, descriptor);
