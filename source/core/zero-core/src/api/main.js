const apiServer = require('./server');
const serverConfig = require('../core/server-config');

const main = {
  createAppServer: ({ env = process.env } = {}) => {
    const publicConfig = serverConfig.load({ file: serverConfig.resolveFile(env) });
    return apiServer.createServer({ publicConfig, env });
  },
  start: ({ env = process.env, host, port } = {}) => new Promise((resolve, reject) => {
    const config = serverConfig.load({ file: serverConfig.resolveFile(env) });
    const resolvedHost = host || env.ZERO_SERVER_HOST || config.host;
    const resolvedPort = Number(port || env.ZERO_SERVER_PORT || config.port);
    const server = main.createAppServer({ env });
    server.once('error', reject);
    server.listen(resolvedPort, resolvedHost, () => {
      const address = server.address();
      console.log(`[Zero-Core] listening http://${address.address}:${address.port}`);
      resolve(server);
    });
  })
};

Object.assign(exports, main);

if (require.main === module) {
  main.start().catch((error) => {
    console.error(`[Zero-Core] fatal: ${error.message}`);
    process.exitCode = 1;
  });
}
