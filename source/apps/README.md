# Zero apps layer

`source/apps` is reserved for ChatGPT-facing app-plugin connector definitions and documentation.

The active runtime layers are:

```text
ChatGPT App Plugin / MCP Server Connector
        ↓
source/core/zero-core
        ↓
source/agent/zero-agent
```

This directory must not contain local desktop plugin package formats or duplicate runtimes:

```text
.codex-plugin/plugin.json
agent-plugin/plugin.json
claude-plugin/plugin.json
plugin.json
mcp.json
.app.json
```

Zero Core owns the public MCP server at `https://zero.miru.work/mcp`. Zero Agent owns machine-local execution. App plugins only describe or document the ChatGPT-facing connector layer.
