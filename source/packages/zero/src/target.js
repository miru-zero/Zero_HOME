'use strict';

const invalid = () => Object.assign(new Error('invalid Zero target'), { code: 'INVALID_TARGET' });
const target = {
  normalize: (value) => {
    if (value === undefined || value === null || value === '' || value === 'local' || value === 'core') {
      return { kind: 'local', name: 'local' };
    }
    if (typeof value === 'string') return { kind: 'device', name: value };
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw invalid();
    if (value.kind === 'local') return { kind: 'local', name: 'local' };
    if (value.device_id) return { kind: 'device', device_id: String(value.device_id) };
    if (value.name) {
      if (value.name === 'local' || value.name === 'core') return { kind: 'local', name: 'local' };
      return { kind: 'device', name: String(value.name) };
    }
    throw invalid();
  },
  isRemote: (value) => target.normalize(value).kind === 'device'
};

Object.assign(exports, target);
