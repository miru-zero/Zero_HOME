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

## Embedded action UI

For ChatGPT auth setup, the final UX must be connector/action-owned embedded UI in ChatGPT, not a normal external web page.

See:

```text
source/apps/chatgpt/ACTION_UI_FLOW.md
```

The current Zero Core ticketed setup page is a QA fallback to prove input capture and `auth.json` writes. Final packaging should start from the ChatGPT action/widget surface and use Zero branding assets from `source/apps/chatgpt/assets`.
