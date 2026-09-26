const serverCommand = require('./server-command');
const deviceRegistry = require('../core/device-registry');
const toolsHub = require('../hub');
const providerRouter = require('./provider-router');

const coreRouter = {
  run: async (args = process.argv.slice(2), env = process.env, output = process.stdout, dependencies = {}) => {
    const [rootCommand, rootAction] = args;
    const createHub = dependencies.createHub || ((options) => toolsHub.createHub(options));

    if (rootCommand === 'server') return serverCommand.run(args.slice(1), env, output);

    if (rootCommand === 'devices' && rootAction === 'pairing') {
      const mode = args[2];
      if (args.length > 3 || (mode && mode !== 'show')) {
        output.write('Usage: zero devices pairing [show]\n');
        return { exitCode: 64 };
      }
      const result = mode === 'show'
        ? deviceRegistry.pairingInfo(env)
        : deviceRegistry.rotatePairingCode(env);
      output.write(result.pairing_code + '\n');
      return { exitCode: 0, pairing_code: result.pairing_code };
    }

    const result = await providerRouter.dispatch({
      args, env, output, dependencies, createHub,
      handleRequestError: (error, target) => {
        target.write(`error=${error.code || 'TOOL_FAILED'} ${error.message || String(error)}\n`);
        return { exitCode: 1 };
      },
      exitCodes: {}
    });
    if (result.handled !== false) return result;
    output.write('error=UNKNOWN_COMMAND\n');
    return { exitCode: 64 };
  }
};

Object.assign(exports, coreRouter);
