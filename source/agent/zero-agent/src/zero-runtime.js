'use strict';

const load = () => {
  try {
    return require('@miruzero/zero');
  } catch (error) {
    if (error?.code !== 'MODULE_NOT_FOUND' || !String(error.message).includes('@miruzero/zero')) throw error;
    return require('../../../packages/zero');
  }
};

const zero = load();
Object.assign(exports, zero);
