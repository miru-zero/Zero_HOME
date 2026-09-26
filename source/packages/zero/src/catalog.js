'use strict';

const descriptor = require('./descriptor');
const fail = (code, message) => Object.assign(new Error(message), { code });
const catalog = {
  create: (items = []) => {
    const canonical = new Map();
    const aliases = new Map();
    for (const item of items) {
      const normalized = descriptor.validate(item);
      if (canonical.has(normalized.name)) throw fail('DUPLICATE_TOOL_ID', 'duplicate tool id: ' + normalized.name);
      canonical.set(normalized.name, normalized);
    }
    for (const item of canonical.values()) {
      for (const alias of item.aliases) {
        if (canonical.has(alias) || aliases.has(alias)) throw fail('DUPLICATE_TOOL_ALIAS', 'duplicate tool alias: ' + alias);
        aliases.set(alias, item.name);
      }
    }
    const resolve = (name) => {
      const canonicalName = canonical.has(name) ? name : aliases.get(name);
      if (!canonicalName) throw fail('UNKNOWN_TOOL', 'unknown Zero tool: ' + name);
      return canonical.get(canonicalName);
    };
    return {
      resolve,
      get: (name) => canonical.get(name) || null,
      list: ({ provider, category } = {}) => [...canonical.values()]
        .filter((item) => !provider || item.provider === provider)
        .filter((item) => !category || item.category === category)
        .sort((a, b) => a.name.localeCompare(b.name))
    };
  }
};

Object.assign(exports, catalog);
