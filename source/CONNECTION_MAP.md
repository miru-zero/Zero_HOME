# Zero Source Connection Map

This file documents the connection points so the next AI/dev does not have to infer the system from code layout.

## Primary flow

```text
ChatGPT profile MCP connector
  URL: https://zero.miru.work/mcp
  auth: none during private testing; OAuth later
        ↓
Zero Core: source/core/zero-core
  GET /health
  GET /tools
  POST /mcp
  POST /providers/{provider}/tools/{tool}/call
  /devices/* registry routes
        ↓
Provider hub inside Core
  source/providers/command
  source/providers/devices
        ↓
Zero Agent(s)
  source/agent/zero-agent
  MiruZero now, TON later
```

## Repository map

| Repository | Visibility | Role | Current relationship |
| --- | --- | --- | --- |
| `miru-zero/Zero_HOME` | private | Monorepo source of truth during active development | Owns Core, Agent, Providers, Packages, docs |
| `miru-zero/Zero-Core` | private | Export/mirror of `source/core/zero-core` | Not fully standalone until dependencies are packaged |
| `miru-zero/Zero-GPT-Plugin` | public | ChatGPT app-plugin / MCP connector documentation repo | Must not contain local plugin runtime files |

## Internal source connections

| From | To | Contract / interface |
| --- | --- | --- |
| `core/zero-core/src/api/mcp.js` | Core hub | Builds MCP tools from hub/provider catalog |
| Core hub | `providers/command/runtime` | Lists/calls command tools |
| Core hub | `providers/devices/runtime` | Lists/calls device tools |
| `providers/command/runtime` | `agent/zero-agent` command library | Reuses agent command descriptors/execution |
| `providers/devices/runtime` | `core/zero-core/src/core/device-registry.js` | Uses Core device registry directly |
| `agent/zero-agent` | Core `/devices/*` routes | Heartbeat, capabilities, task polling, task result |
| `packages/zero` | Core/Providers/Agent | Shared contract version, tool-id parser, descriptors |

## Boundary rules

1. ChatGPT app/plugin logic belongs in the ChatGPT connector layer, not in Core.
2. Core owns the public MCP endpoint and access-control boundary.
3. Providers adapt Core calls to concrete tool catalogs.
4. Agent executes on a paired machine and must stay behind device pairing and path policy.
5. Apps must stay documentation/connector-only unless a future explicit app runtime is designed.

## Known live endpoint

```text
https://zero.miru.work/mcp
```

Local MiruZero Core service:

```text
http://127.0.0.1:8050
```
