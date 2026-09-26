#!/usr/bin/env node
const coreRouter = require('./cli/core-router');

const cli = {
  run: (args = process.argv.slice(2), env = process.env, output = process.stdout, dependencies = {}) =>
    coreRouter.run(args, env, output, dependencies)
};

Object.assign(exports, cli);

if (require.main === module) {
  cli.run().then((result) => { process.exitCode = result.exitCode; }).catch((error) => {
    console.error(`[Zero-Core] fatal: ${error.message}`);
    process.exitCode = 1;
  });
}
