const apiMain = require('./api/main');

const main = {
  start: (options = {}) => apiMain.start(options)
};

Object.assign(exports, main);

if (require.main === module) {
  main.start().catch((error) => {
    console.error(`[Zero-Core] fatal: ${error.message}`);
    process.exitCode = 1;
  });
}
