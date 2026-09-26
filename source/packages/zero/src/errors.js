'use strict';

const errors = {
  normalize: (error, context = {}) => ({
    ok: false,
    error: {
      code: error?.code || 'ZERO_ERROR',
      message: error?.message || String(error || 'Zero error'),
      ...(Number.isInteger(error?.status) ? { status: error.status } : {}),
      retryable: error?.retryable === true,
      ...(context.target !== undefined ? { target: context.target } : {})
    }
  })
};

Object.assign(exports, errors);
