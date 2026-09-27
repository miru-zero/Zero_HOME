# Apps Layer

`source/apps` is no longer a production runtime layer.

It is reserved for ChatGPT-facing app/plugin connector documentation and metadata planning only.

## Current decision

Do not reintroduce these removed runtime copies:

```text
source/apps/agent
source/apps/mcp
source/apps/devices
source/apps/gateway
```

Those responsibilities now belong to:

| Old apps path | Current owner |
| --- | --- |
| `apps/agent` | `source/agent/zero-agent` |
| `apps/mcp` | `source/core/zero-core` |
| `apps/devices` | `source/core/zero-core` + `source/providers/devices` |
| `apps/gateway` | Core public server boundary, if needed later by explicit design |

## ChatGPT connector target

```text
https://zero.miru.work/mcp
```

The connector should be created as a ChatGPT profile MCP server connector. It should not be a Codex local plugin package.
