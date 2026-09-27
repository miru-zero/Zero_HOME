# Zero Source Handoff

Use this as the first handoff note for future AI sessions.

## Current branch

```text
set2-execution-foundation
```

Latest known source architecture commit:

```text
3a62350 refactor: move apps layer to connector docs
```

## Current architecture decision

Zero has three active runtime boundaries:

```text
Core Server → Provider adapters → Agent executor
```

The ChatGPT app/plugin side is a connector surface only. It should point to Core's MCP endpoint and should not contain filesystem/device implementation logic.

## Current live Core state

Core is expected to run from:

```powershell
M:\Zero_HOME\source\core\zero-core
```

Known local launch state on MiruZero:

```text
host: 0.0.0.0
port: 8050
public MCP URL: https://zero.miru.work/mcp
```

Expected MCP tool surface:

```text
helper tools: 2
command tools: 29
devices tools: 4
total: 35
```

## What changed recently

- `source/apps/*` runtime copies were removed.
- `source/apps` now documents the ChatGPT connector layer only.
- Core MCP tool listing now derives from Core hub/providers instead of a stale hard-coded subset.
- `Zero-GPT-Plugin` was reset to connector/docs logic, not local plugin packaging.
- `Zero-Core` private repo was created as an export/mirror, not yet a standalone package.

## Before editing

1. Read `source/README.md` and `source/CONNECTION_MAP.md`.
2. Check `git status --short` and do not accidentally add untracked runtime/secrets.
3. Keep runtime edits inside the correct boundary.
4. Preserve object-module export style in Zero `src` code.
5. Run the narrowest relevant tests before claiming completion.

## Known pending item

`source/skill/logic` exists as untracked/pending skill material. Do not treat it as production runtime until explicitly promoted.
