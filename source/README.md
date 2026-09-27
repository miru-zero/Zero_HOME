# Zero Source Map

This directory is the production source boundary for Zero. Start here before editing code.

## Runtime architecture

```text
ChatGPT App Plugin / MCP Server Connector
        ↓
source/core/zero-core
        ↓
source/providers/* + source/packages/*
        ↓
source/agent/zero-agent on paired machines
```

## Layer ownership

| Path | Owner role | Runtime responsibility | Must not become |
| --- | --- | --- | --- |
| `core/zero-core` | Core server | Public MCP endpoint, provider routing, device registry, future OAuth boundary | Agent runtime or local plugin package |
| `agent/zero-agent` | Device executor | Runs canonical tools on paired machines under local policy | Server registry or ChatGPT app layer |
| `providers/command` | Core provider | Canonical filesystem/path tool adapter backed by agent command library | Independent duplicate filesystem implementation |
| `providers/devices` | Core provider | Device registry tools: list/status/heartbeat/exec | Separate device server app |
| `packages/zero` | Shared contract | Tool IDs, contracts, descriptors, runtime conventions | Product app logic |
| `packages/common` | Shared utilities | HTTP/config helpers used by legacy and transition code | Runtime owner |
| `apps` | Connector documentation | ChatGPT-facing app/plugin connector notes only | Codex local plugin, MCP runtime, Agent copy |
| `skill` | Skill/source knowledge | Prompt/logic skill material pending promotion | Runtime code without explicit promotion |

## Current rule

Core, Agent, Providers, and Packages are production code. Apps is not a runtime implementation layer anymore. Do not reintroduce `source/apps/agent`, `source/apps/mcp`, `source/apps/devices`, or `source/apps/gateway` as production runtimes.

## Canonical tool naming

Use full canonical tool IDs:

```text
zero.command.filesystem.readFile
zero.command.path.joinPath
zero.devices.exec
```

`target`, `via`, and device names are arguments or routing dimensions. They are not tool-name segments.

## Required next-docs

Read these before continuing:

- `source/CONNECTION_MAP.md`
- `source/HANDOFF.md`
- `source/NEXT_STEPS.md`
