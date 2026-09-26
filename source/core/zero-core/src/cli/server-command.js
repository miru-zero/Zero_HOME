const serverConfig = require('../core/server-config');

const printUsage = (output) => {
  output.write('Usage: zero server <setup|show|env> [domain] [host:port|port]\n');
  output.write('  zero server setup                         ใช้ default zero.miru.work + 0.0.0.0:8050\n');
  output.write('  zero server setup zero.miru.work          ตั้ง domain แต่ใช้ host/port default\n');
  output.write('  zero server setup zero.miru.work 8080     ตั้ง port โดย host ยังเป็น 0.0.0.0\n');
  output.write('  zero server setup zero.miru.work 0.0.0.0:8050\n');
  output.write('  zero server show                          อ่าน config ปัจจุบัน\n');
  output.write('  zero server env                           พิมพ์ env สำหรับ process server\n');
  return { exitCode: 64 };
};
const printConfig = (output, config, file) => {
  output.write(`server_config=${file}\n`);
  output.write(`domain=${config.domain}\n`);
  output.write(`host=${config.host}\n`);
  output.write(`port=${config.port}\n`);
  output.write(`bind=${config.bind}\n`);
  output.write(`baseUrl=${config.baseUrl}\n`);
};

exports.run = (args, env, output) => {
  const [action, domain, endpoint] = args;
  const file = serverConfig.resolveFile(env);
  if (!action) return printUsage(output);
  if (action === 'setup') {
    const config = serverConfig.save({ file, domain, endpoint });
    printConfig(output, config, file);
    return { exitCode: 0, config };
  }
  if (action === 'show' || action === 'config' || action === 'status') {
    const config = serverConfig.load({ file });
    printConfig(output, config, file);
    return { exitCode: 0, config };
  }
  if (action === 'env') {
    const config = serverConfig.load({ file });
    output.write(`ZERO_SERVER_DOMAIN=${config.domain}\n`);
    output.write(`ZERO_SERVER_HOST=${config.host}\n`);
    output.write(`ZERO_SERVER_PORT=${config.port}\n`);
    output.write(`ZERO_SERVER_BASE_URL=${config.baseUrl}\n`);
    return { exitCode: 0, config };
  }
  return printUsage(output);
};
