# ChatGPT Connector Notes

This folder documents the ChatGPT-facing app/plugin connector layer.

## Correct flow

```text
ChatGPT MCP Server Connector
  name: Zero
  server URL: https://zero.miru.work/mcp
  auth: none for private testing; OAuth later
        ↓
Zero Core Server
```

## Incorrect flow

Do not package Zero as:

```text
.codex-plugin/plugin.json
agent-plugin/plugin.json
claude-plugin/plugin.json
local desktop plugin package
```

Those formats make ChatGPT/Codex treat Zero as a local plugin instead of a server-side MCP connector.

## Related repo

`miru-zero/Zero-GPT-Plugin` now documents the app-plugin connector layer. It must not contain runtime logic or local plugin packaging.
