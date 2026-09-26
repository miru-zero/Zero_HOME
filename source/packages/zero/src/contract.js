'use strict';

const VERSION = '1.0.0';
const versionMajor = (value) => {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/.exec(String(value || ''));
  return match ? Number(match[1]) : null;
};
const mismatch = (actual) => Object.assign(
  new Error(`Zero contract major mismatch: expected ${VERSION}, got ${actual}`),
  { code: 'CONTRACT_VERSION_MISMATCH', expected: VERSION, actual }
);
const contract = {
  version: VERSION,
  isCompatible: (other) => versionMajor(other) === versionMajor(VERSION),
  assertCompatible: (other) => {
    if (!contract.isCompatible(other)) throw mismatch(other);
    return true;
  }
};

Object.assign(exports, contract);
