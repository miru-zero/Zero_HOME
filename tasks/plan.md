# Implementation Plan: Zero Tools Unification

Date: 2026-09-26
Design: `docs/superpowers/specs/2026-09-26-zero-tools-unification-design.md`
Research: `docs/research/zero-unified-runtime-primary-sources-2026-09-26.md`
Task list: `tasks/zero-tools-unification-checklist.md`

## Overview

Unify Core, Apps, and Agent around one versioned Zero contract/catalog. Work is delivered as vertical triplet slices: a slice is not complete until Server routing, Plugin exposure, and Local/Remote Agent execution pass together.

## Architecture Decisions

- Shared package: `source/packages/zero` / `@miruzero/zero`.
- Sandbox is a disposable full-project test workspace. Copy the relevant production project trees into `sandbox/projects/...`, modify and test there, then promote only verified diffs back into `source/`. Production package scripts are not coupled to sandbox paths.
- Canonical tool id: `zero.<provider>.<category>.<function>`.
- Core owns orchestration and target routing, not machine command implementations.
- Apps own protocol/integration adaptation, not duplicate tool definitions.
- Agent owns machine-effecting command implementation and exports it as a library plus daemon/CLI.
- `target` and `via` are execution dimensions, not additional tool names.
- Legacy tool names remain aliases until parity is proven.
- Every contract change carries `contractVersion`; remote dispatch rejects incompatible major versions.

## Delivery Rule: Triplet Gate

For every capability slice:

1. Agent executes the canonical semantic call locally.
2. Core routes the same call locally and remotely.
3. App exposes the same descriptor/call without copying schema.
4. CLI/HTTP/MCP results normalize to the same contract.
5. The slice is not marked complete until all four checks pass.

No "Agent first, wire MCP later" and no "MCP schema now, implementation later".

## Phase 0 — Baseline and Test Harness

Preserve current behavior before moving ownership. Fix only the test harness needed to measure migration; do not add new capabilities yet.

### Tasks 0.1–0.4

- Copy Core + Apps + Agent into one isolated `sandbox/projects/zero-tools-unification` workspace. Modify and run tests inside that copied system; do not repoint production package scripts to sandbox paths.
- In the sandbox copy, make MCP tests runnable from its copied package and record existing failures; do not edit production yet.
- In the sandbox copy, add focused Core baseline tests around tool discovery/call behavior before replacement.
- Record current canonical/legacy tool lists and error envelopes as compatibility fixtures.

### Checkpoint 0

- The copied sandbox Agent, Apps, and Core baseline tests run from the isolated workspace; source remains untouched until promotion.
- Apps MCP tests runnable and green or every existing failure recorded.
- Devices 12/12 remains green.
- Core discovery/call baseline is captured.

## Phase 1 — Shared Zero Contract Kernel

All implementation phases run in `sandbox/projects/zero-tools-unification` first. Paths written as `source/...` are production promotion targets, not initial edit locations. Create the sandbox copy of `source/packages/zero` without changing production execution yet.

### Tasks 1.1–1.4

- Implement contract version, canonical tool-id parser/formatter, descriptor validation, error normalization, and catalog interface.
- Export only the public contract/runtime seam through package `exports`; keep implementation subpaths private.
- Add unit tests for IDs, categories, aliases, incompatible contract majors, duplicate tool IDs, and deterministic catalog ordering.
- Wire Core, Apps/MCP, and Agent to report/use the same contract version while keeping legacy execution active.

### Checkpoint 1 — Triplet Contract

- Core, Apps, Agent import the same package successfully.
- Agent capability payload includes `contractVersion`.
- No command implementation has been duplicated into Shared Zero.
- All baseline tests remain green.

## Phase 2 — Tracer Bullet: `zero.command.filesystem.readFile`

This is the first full vertical slice and proves the architecture before mass migration.

### Tasks 2.1–2.5

- Agent: move `readFile` into canonical `command/filesystem` library ownership and expose descriptor + handler from the Agent package.
- Core: replace local command implementation with a provider adapter that invokes the Agent library; add target resolver seam without remote behavior change yet.
- Apps/MCP: derive the MCP tool from the shared catalog instead of hard-coding its schema.
- CLI/HTTP: support category-aware discovery/call while preserving `zero command readFile` and `zero.command.readFile` aliases.
- Add end-to-end tests proving direct Agent, Core call, CLI, HTTP, and MCP return equivalent read semantics/errors.

### Checkpoint 2 — First Complete Slice

- `zero command filesystem readFile` works locally.
- `zero.command.filesystem.readFile` appears through MCP from catalog metadata.
- Legacy readFile names still work through aliases.
- No second readFile implementation remains in Core/Apps/providers.

## Phase 3 — Target Routing and Remote Parity

Use the same tracer tool to prove local and remote execution share one semantic contract.

### Tasks 3.1–3.5

- Add explicit target model (`core/local` or device id/name) to runtime context; avoid mutable implicit global target state.
- Extend device task payload with canonical tool id, `contractVersion`, deadline, and semantic arguments.
- Agent validates contract compatibility and target-side policy before executing the local command library.
- Core routes local calls directly and remote calls through the device transport; normal callers never need to construct `devices.exec` nesting.
- Run the same readFile parity test on MiruZero and TON; compare normalized result/error shape.

### Checkpoint 3 — Local = Remote Contract

- One tool identity works on Core-local and TON without caller-side shell syntax.
- Incompatible contract versions fail before execution with a stable error.
- Device capability hash changes when the advertised canonical catalog changes.

## Phase 4 — Migrate Existing Command Surface

Migrate the current filesystem tools vertically in small groups; each group crosses Agent + Core + Apps before moving on.

### Tasks 4.1–4.4

- Read group: `readFiles`, `listDirectory`, `getFileInfo`, `globFiles`, `grepFiles`.
- Mutation group: `writeFile`, `replaceFile`, `createDirectory`, `deleteFile`.
- Parity group currently present only in provider runtime: `copyFile`, `moveFile`, `renameFile`, `exists`, `hashFile`; move ownership into Agent and add schemas/tests there.
- After each group, remove the superseded handler/schema copy from provider/Core/MCP code only when triplet parity passes.

### Checkpoint 4 — One Command Owner

- `source/agent/zero-agent` is the only machine-command implementation owner.
- `source/providers/command` is registration/compatibility glue only, or removed if the shared registry fully replaces it.
- `source/apps/agent` duplicate production tree is removed after its tests are preserved in the external sandbox test harness.
- Core/App command schemas come only from catalog descriptors.

## Phase 5 — Filesystem Safety Before Expansion

Harden the command seam before adding more write/process/network power.

### Tasks 5.1–5.4

- Replace lexical root checks with real-path-aware root enforcement, including Windows junction/symlink escape cases and non-existing destinations resolved through the nearest existing ancestor.
- Add bounded byte/line/result limits and consistent validation errors for reads, globs, greps, directory walks, and batch operations.
- Normalize mutation failure semantics and add idempotency metadata where retries could duplicate effects.
- Add security regression tests that run through direct Agent and remote Core routing, not only helper-level tests.

### Checkpoint 5 — Safe Execution Seam

- Root escape tests fail closed locally and remotely.
- Unbounded traversal/output is impossible through public command calls.
- Error envelopes contain no tokens/request-body secrets.

## Phase 6 — Complete File / Directory and Path Categories

Add the planned foundation only after ownership and safety are proven.

### Tasks 6.1–6.4

- File/Directory additions: `appendFile`, `createFile`, `touchFile`, `copyDirectory`, `moveDirectory`, `deleteDirectory`, `truncateFile` plus any missing existing primitives.
- Path additions: `resolvePath`, `normalizePath`, `joinPath`, `relativePath`, `getParentDirectory`, `getFilename`, `getExtension`.
- Mark pure path operations as target-independent where correct; platform-sensitive resolution uses target platform metadata instead of guessing on Core.
- Add batch parity tests and category discovery tests across CLI/HTTP/MCP.

### Checkpoint 6 — Foundation Complete

- File/Directory and Path catalogs are complete and category-addressable.
- `zero tools command filesystem` and `zero tools command path` show only those categories.
- `/tools?pvd=command&cat=filesystem|path` returns the same catalog view.
- MCP no longer dumps unrelated categories when a scoped catalog is requested.

## Phase 7 — Execution Adapters (`via`)

Introduce the adapter seam only when at least two real implementations exist.

### Tasks 7.1–7.3

- Keep `native` as preferred execution for semantic commands.
- Implement one Windows alternate adapter for a small tracer set (`readFile` first), then add `cmd`/PowerShell only where behavior is well-defined and testable.
- Agent advertises available adapters per capability; Core chooses only from advertised adapters and never synthesizes shell commands itself.

### Checkpoint 7

- Same semantic read call yields equivalent normalized output through native and alternate adapter.
- Payload remains semantic (`path`, options), never raw command text.
- Unsupported `via` fails before execution.

## Phase 8 — Progressive Discovery / Logic Hook Integration

Connect the future Progressive Capability Graph to catalog discovery without coupling knowledge navigation to execution.

- Index -> provider/category/function metadata only.
- Peek -> summary, risk, target support, adapter support, related capability links.
- Open -> full schema/instructions only for selected tools/skills.
- Links are discoverable, not executable.

## Phase 9 — Expand Remaining Categories

After the foundation is stable, add Disk, Process, Exec, System, Network, Archive, Data, Watch, Batch, and Util as independent vertical triplet slices. Each category gets its own safety policy and target capability advertisement.

Process/Exec must separate executable from argv, default shell off, enforce timeout/cancellation/output quotas, and scope process handles to the target device. Network must define SSRF/address policy before `httpRequest` or download tools are exposed. Archive extraction must defend against path traversal/zip-slip and output expansion limits.

## Cleanup / Removal Gate

Delete legacy implementations only after replacement parity is demonstrated:

- remove duplicate `source/apps/agent` production copy;
- remove command handlers from `source/providers/command/runtime` after Agent ownership is complete;
- remove hard-coded command/device definitions from Core MCP after `apps/mcp` catalog adaptation is complete;
- remove the duplicate Core MCP protocol implementation once Core delegates to the MCP App;
- keep compatibility aliases separately from implementation so aliases can be deleted without moving logic.

## Verification Matrix

Every migrated capability is tested across:

- Agent library direct call;
- Agent daemon task execution;
- Core local routing;
- Core remote routing;
- CLI command;
- HTTP discovery/call;
- MCP tools list/call;
- legacy alias during compatibility window.

Use MiruZero for local integration and TON for remote E2E after the matching Agent build is installed. Never infer remote parity from local tests alone.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Contract drift across independently deployed Agent/Core/App | High | versioned `@miruzero/zero`, major compatibility check, capability hash |
| Big-bang migration breaks all surfaces | High | tracer bullet + vertical triplet checkpoints + legacy aliases |
| MCP spec changes leak into Zero runtime | High | MCP revision logic stays inside `apps/mcp` |
| Command expansion increases attack surface | High | harden Agent seam before Process/Exec/Network expansion |
| Duplicate trees return during migration | High | deletion gate + catalog/schema single-source tests |
| Tool flood overwhelms model context | Medium | hierarchical/scoped discovery and lazy schema exposure |
| Remote round trips become slow | Medium | target-side batch operations, capability cache, bounded outputs |

## Plan Exit Condition

Implementation is complete only when Core serves the canonical catalog/routing, Apps extend it without schema copies, Agent exclusively owns local command execution, and all three pass the same end-to-end contract tests.

