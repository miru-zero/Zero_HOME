#!/usr/bin/env node
'use strict';

const cli = require('../src/cli');

cli.run(process.argv.slice(2), process.env)
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    console.error('[zero-agent] fatal: ' + (error && error.message ? error.message : String(error)));
    process.exitCode = 1;
  });
