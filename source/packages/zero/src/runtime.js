'use strict';

const bad = (message) => Object.assign(new Error(message), { code: 'INVALID_RUNTIME' });
const runtime = {
  create: ({ catalog, invoke } = {}) => {
    if (!catalog || typeof catalog.list !== 'function' || typeof catalog.resolve !== 'function') {
      throw bad('runtime requires a catalog');
    }
    if (typeof invoke !== 'function') throw bad('runtime requires invoke(descriptor,args,context)');
    return {
      list: (filter = {}) => catalog.list(filter),
      call: (name, args = {}, context = {}) => invoke(catalog.resolve(name), args, context)
    };
  }
};

Object.assign(exports, runtime);
