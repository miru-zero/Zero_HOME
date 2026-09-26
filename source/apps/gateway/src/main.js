'use strict';
const { runMain } = require('../../../packages/common/src');
const { createServer } = require('./server');
if (require.main === module) runMain(createServer, 'gateway');
