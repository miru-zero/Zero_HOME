'use strict';

const contract = require('./contract');
const toolId = require('./tool-id');
const descriptor = require('./descriptor');
const catalog = require('./catalog');
const errors = require('./errors');
const runtime = require('./runtime');
const target = require('./target');

const zero = { contract, toolId, descriptor, catalog, errors, runtime, target };

Object.assign(exports, zero);
