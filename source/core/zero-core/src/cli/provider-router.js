const helpEngine = require('../hub/help');

const isHelpToken = (value) => value === 'help' || value === '--help' || value === '-h';

const extractExecutionOptions = (values = []) => {
  const args = [];
  const execution = {};
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === '--target' && values[index + 1] !== undefined) { execution.target = values[++index]; continue; }
    if (value === '--wait' && values[index + 1] !== undefined) { execution.waitMs = Number(values[++index]); continue; }
    args.push(value);
  }
  return { args, execution };
};

const renderTools = (output, providerName, provider, items) => {
  output.write(`provider=${providerName} type=${provider.type} tools=${items.length}\n`);
  for (const item of items) {
    output.write(`  ${item.name}${item.description ? `  — ${item.description}` : ''}\n`);
    const schema = item.inputSchema;
    const properties = schema?.properties && typeof schema.properties === 'object' ? schema.properties : {};
    const required = Array.isArray(schema?.required) ? schema.required : [];
    const names = Object.keys(properties);
    if (names.length) {
      const rendered = names.map((param) => {
        const type = properties[param]?.type || 'any';
        return required.includes(param) ? `${param}:${type}*` : `${param}:${type}`;
      });
      output.write(`      args: ${rendered.join(', ')}  (* = required)\n`);
    }
  }
};

const listTools = (hub, dependencies, providerName) => {
  const fn = dependencies.listTools || ((name, ctx) => hub.listTools(name, ctx));
  return fn(providerName, {});
};

const buildInternalContext = async ({ env, provider }) => {
  if (provider.type !== 'internal') return { exitCode: null, context: {} };
  return { exitCode: null, context: { env } };
};

exports.isHelpToken = isHelpToken;

exports.dispatch = async (options) => {
  const { args: rawArgs, env, output, dependencies, createHub, inspectAuthWithRefresh, authStatusLine,
    resolveSessionFile, resolveAgentTaskFile, handleRequestError, exitCodes } = options;
  const { args, execution } = extractExecutionOptions(rawArgs);
  const [rootCommand, rootAction] = args;

  let hub;
  try {
    hub = createHub({ env });
  } catch (error) {
    output.write(`error=${error.code || 'HUB_ERROR'} ${error.message}\n`);
    return { exitCode: 70 };
  }

  const providerName = rootCommand;
  const provider = providerName ? hub.getProvider(providerName) : null;
  try {
    if (!providerName || isHelpToken(providerName)) {
      const providers = dependencies.listProviders ? dependencies.listProviders() : hub.listProviders();
      helpEngine.renderModules(output, providers);
      return { exitCode: isHelpToken(providerName) ? 0 : 64 };
    }

    if (providerName === 'tools') {
      if (args.length !== 1) {
        output.write('Usage: zero tools   (ดู provider ที่ประกาศไว้) แล้ว zero <provider> เพื่อดู tools\n');
        return { exitCode: 64 };
      }
      const providers = dependencies.listProviders ? dependencies.listProviders() : hub.listProviders();
      output.write(`config=${hub.configFile || '-'}\nproviders=${providers.length}\n`);
      for (const item of providers) {
        output.write(`  ${item.name}  type=${item.type}${item.command ? `  command=${item.command}` : ''}\n`);
      }
      return { exitCode: 0, providers };
    }

    if (!provider) {
      output.write(`error=UNKNOWN_PROVIDER ไม่มี provider "${providerName}" — zero เข้าถึงได้เฉพาะ provider ที่ประกาศ tool ไว้เท่านั้น (zero tools เพื่อดูรายชื่อ)\n`);
      return { exitCode: 71 };
    }

    if (args.length === 2 && (isHelpToken(rootAction) || rootAction === 'tools')) {
      const items = await listTools(hub, dependencies, providerName);
      helpEngine.renderToolList(output, provider, items);
      return { exitCode: 0, tools: items };
    }

    if (args.length === 3 && isHelpToken(args[2]) && args[1] !== 'call') {
      const items = await listTools(hub, dependencies, providerName);
      const tool = items.find((item) => item.name === args[1]);
      if (!tool) {
        output.write(`error=UNKNOWN_TOOL ไม่มี tool "${args[1]}" ใน provider "${providerName}"\n`);
        return { exitCode: 72 };
      }
      helpEngine.renderToolHelp(output, provider, tool);
      return { exitCode: 0, tool };
    }

    if (args.length === 1) {
      const items = await listTools(hub, dependencies, providerName);
      renderTools(output, providerName, provider, items);
      return { exitCode: 0, tools: items };
    }

    let categoryTool = null;
    if (args[1] !== 'call' && args.length >= 3) {
      const items = await listTools(hub, dependencies, providerName);
      categoryTool = items.find((item) => item.category === args[1] && (item.function || item.name) === args[2]) || null;
    }
    if (categoryTool && args.length === 4 && isHelpToken(args[3])) {
      helpEngine.renderToolHelp(output, provider, categoryTool);
      return { exitCode: 0, tool: categoryTool };
    }
    const isCategoryCall = Boolean(categoryTool);
    const isRawCall = !isCategoryCall && args[1] === 'call';
    const toolName = isCategoryCall ? categoryTool.name : (isRawCall ? args[2] : args[1]);
    const jsonArg = isCategoryCall ? args[3] : (isRawCall ? args[3] : args[2]);
    const validCallShape = isCategoryCall
      ? Boolean(toolName) && (args.length === 3 || args.length === 4)
      : (isRawCall
        ? Boolean(toolName) && (args.length === 3 || args.length === 4)
        : Boolean(toolName) && (args.length === 2 || args.length === 3));
    if (!validCallShape) {
      output.write(`Usage: zero ${providerName} [<category>] <tool> '<json>'${provider.type !== 'internal' ? `  หรือ  zero ${providerName} <tool> '<json>'` : ''}\n`);
      return { exitCode: 64 };
    }

    let toolArgs = {};
    if (jsonArg) {
      try {
        toolArgs = JSON.parse(jsonArg);
      } catch {
        output.write('error=INVALID_JSON args ต้องเป็น JSON เช่น \'{"key":"value"}\'\n');
        return { exitCode: 65 };
      }
    }

    const ctx = await buildInternalContext({ env, dependencies, output, provider,
      inspectAuthWithRefresh, authStatusLine, resolveSessionFile, resolveAgentTaskFile, exitCodes });
    if (ctx.exitCode !== null) return { exitCode: ctx.exitCode };

    try {
      const fn = dependencies.callTool || ((name, tool, toolArgsInput, context) => hub.callTool(name, tool, toolArgsInput, context));
      const result = await fn(providerName, toolName, toolArgs, { ...ctx.context, ...execution });
      output.write(`${JSON.stringify(result, null, 2)}\n`);
      return { exitCode: 0, result };
    } catch (error) {
      if (error?.code === 'UNKNOWN_TOOL') {
        output.write(`error=UNKNOWN_TOOL ${error.message}\n`);
        return { exitCode: 72 };
      }
      if (error?.code === 'MCP_TIMEOUT' || error?.code === 'MCP_EXITED'
        || error?.code === 'MCP_SPAWN_FAILED' || error?.code === 'MCP_ERROR') {
        output.write(`error=${error.code} ${error.message}\n`);
        return { exitCode: 73 };
      }
      return handleRequestError(error, output);
    }
  } finally {
    if (hub && typeof hub.close === 'function') hub.close();
  }
};
