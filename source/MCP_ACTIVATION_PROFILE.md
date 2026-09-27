# MCP Activation Profile

This document defines the values required to activate Zero through a real ChatGPT MCP connector.

The purpose is to make activation reproducible without guessing from chat history.

## Current activation mode

```text
Mode: private testing
ChatGPT connector auth: None
Core endpoint: https://zero.miru.work/mcp
Future auth mode: OAuth at the Zero Core boundary
```

## Activation owner map

| Value | Owner | Where it is set | Visible to AI chat? | Notes |
| --- | --- | --- | --- | --- |
| `https://zero.miru.work/mcp` | ChatGPT MCP connector | ChatGPT app/profile MCP server URL | Yes | Public endpoint value. |
| `Authentication=None` | ChatGPT MCP connector | ChatGPT app/profile MCP auth setting | Yes | Current private test mode only. |
| `ZERO_SERVER_HOST=0.0.0.0` | Zero Core runtime | Core launch env | No | Binds Core service. |
| `ZERO_SERVER_PORT=8050` | Zero Core runtime | Core launch env | No | Tunnel/proxy must point here. |
| `ZERO_COMMAND_ROOTS=M:\Zero_HOME` | Zero Core/provider policy | Core launch env | No | Controls allowed command filesystem roots. |
| `ZERO_AGENT_ROOTS=M:\Zero_HOME` | Zero Agent policy | Agent launch env | No | Controls device-side allowed roots. |
| device auth key/token | Device/Core secret boundary | Pairing flow or secret store | No | Never put raw key in prompts or docs. |

## Activation gate

Before using Zero from ChatGPT, verify:

1. ChatGPT MCP connector points to `https://zero.miru.work/mcp`.
2. Connector auth is `None` until OAuth is implemented.
3. Core `/health` returns `ok=true`.
4. MCP `tools/list` returns helper tools, 29 command tools, and 4 device tools.
5. `MiruZero` is online in `zero.devices.list`.
6. Device-side `zero.devices.exec` works only under allowed roots.

## Secret rule

AI may request activation, pairing, and status checks, but AI must not receive or display raw auth keys.

Allowed:

```text
Create a pairing request.
Store a machine key through a secret channel.
Report that a key is present, missing, expired, or invalid.
```

Not allowed:

```text
Paste the machine auth key into chat.
Save raw keys in Markdown.
Print raw keys in logs.
Return raw keys through MCP tool output.
```
