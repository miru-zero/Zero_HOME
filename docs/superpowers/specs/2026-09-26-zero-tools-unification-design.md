# Zero Tools Unification Design

Date: 2026-09-26
Status: DESIGN READY FOR REVIEW
Conversation anchor: `6ab77364-cb90-83ec-814b-60b8e4d9e8f5`

## Objective

Build Zero Tools on one contract so Core, Apps, and Agent evolve as one system without duplicating tool logic.

Role invariant:

> Core serves. Apps extend. Agent executes. Shared Zero defines the contract.

The migration must preserve the three runtime roles:

- `source/core/zero-core` — server/orchestration/routing.
- `source/apps` — plugins/protocol adapters such as MCP and device integration.
- `source/agent/zero-agent` — local command execution on each machine.
- `source/packages/zero` — shared, distributable Zero contract/runtime kernel.

A feature is not complete until its Core + App + Agent path works end-to-end. No phase may land a contract change on only one side.

## Non-negotiable architecture rules

1. Tool implementation exists once. Agent owns machine-effecting command implementation.
2. Core never reimplements filesystem/process/network command logic.
3. Apps never own duplicate tool schemas; they adapt the shared catalog to external protocols.
4. Shared Zero owns tool identity, descriptors, schema contracts, error shape, catalog behavior, and contract version.
5. Remote execution re-validates policy on the target Agent; Core authorization is not sufficient by itself.

## Canonical Tool Model

Canonical external identity:

`zero.<provider>.<category>.<function>`

Examples:

- `zero.command.filesystem.readFile`
- `zero.command.path.getFilename`
- `zero.command.process.startProcess`
- `zero.chatgpt.conversation.get`

Execution dimensions are arguments, not extra tool names:

- `target` = WHERE the operation runs.
- `via` = HOW the target performs the operation.
- `timeout` / `profile` = execution policy.

`via` must never mean "accept arbitrary shell text". For example, `via: "cmd"` with `readFile` still accepts semantic file arguments; the adapter constructs the command safely.

Legacy names such as `zero.command.readFile` remain temporary aliases during migration and are removed only after parity tests and explicit deprecation.

## Shared Zero Package

Create `source/packages/zero` as package `@miruzero/zero`, supporting Node.js 20+ because the published Agent supports Node.js 20+.

The package must stay small and dependency-light. It contains contract/runtime primitives, not OS implementations:

- contract version and compatibility checks;
- tool-id parser/formatter;
- catalog and descriptor validation;
- normalized Zero error envelope;
- provider registration contract;
- `list()` / `call()` runtime seam;
- target/via metadata contracts.

## Role Ownership

### Core / Server

Core owns orchestration only: server lifecycle, auth, plugin registry, target resolution, local/remote routing, policy orchestration, and observability. Core consumes the shared catalog and must not hard-code MCP schemas or command handlers.

### Apps / Plugins

Apps adapt or extend Zero. `apps/mcp` owns MCP protocol revisions and converts MCP discovery/calls into Shared Zero list/call operations. Protocol-specific state must not leak into Core or Agent. Other Apps may add providers, hooks, transports, or external integrations through the same registration contract.

### Agent / Local Command

Agent owns execution on a machine. Machine-effecting categories live here: filesystem, path operations that depend on target platform, disk, process, exec, system, network, archive, watch, and batch. Pure shared helpers may live in Shared Zero when they have no machine dependency.

Agent must expose its command implementation as a library entry point as well as through the `zero-agent` daemon/CLI, so Core can execute local commands without spawning an unnecessary subprocess.

## Local and Remote Data Flow

Local call:

`CLI/HTTP/MCP -> Core runtime -> command provider -> local Agent command library -> result`

Remote call:

`CLI/HTTP/MCP -> Core runtime -> target router -> device transport -> remote Agent -> local command library -> result`

The semantic tool ID and schema remain the same in both flows. Only `target` changes.

Remote task payloads carry `contractVersion`, canonical tool ID, semantic arguments, deadline/idempotency metadata when needed, and no prebuilt shell command.

Agent heartbeat/capabilities advertise `agentVersion`, `contractVersion`, platform/architecture, capability hash, categories, and available adapters. Core rejects incompatible contract majors before dispatch.

## Discovery and Progressive Exposure

Discovery must be hierarchical instead of dumping the entire catalog:

- `/tools` -> providers summary.
- `/tools?pvd=command` -> command categories.
- `/tools?pvd=command&cat=filesystem` -> filesystem functions.
- CLI mirrors the same hierarchy: `zero tools`, `zero tools command`, `zero tools command filesystem`.
- MCP Apps expose a scoped subset from the same catalog when the host/task scope is known; full catalog remains available only when explicitly requested.

This keeps the future Logic Hook / Progressive Capability Graph independent from execution. Links and metadata guide discovery; they do not auto-load or auto-execute tools.

## Safety and Error Contract

Before expanding command categories, the Agent command seam must enforce real-path allowed roots, junction/symlink escape protection, bounded reads/search/output, semantic argument validation, timeout/cancellation, and target-side authorization.

Process execution defaults to executable + argv separation with shell disabled. Shell adapters are explicit `via` choices and are never a generic raw-command escape hatch.

All surfaces normalize failures into one stable machine-readable Zero error shape without leaking secrets or arbitrary request bodies.

## Test Layout

Sandbox is a disposable full-project staging area, not a permanent test dependency of production packages. For each migration slice, copy the required Core + Apps + Agent project trees into `sandbox/projects/<work>`, modify and test the copied system end-to-end, then promote only verified diffs back into `source/`. Production code and package scripts must not depend on sandbox paths.

## Migration Rule

Migration is vertical. Every implementation step updates and verifies Core + relevant App + Agent together. Do not build all Agent tools first and "connect MCP later".

The first tracer bullet is `zero.command.filesystem.readFile`: Agent implementation, Shared Zero descriptor, Core local/remote routing, CLI hierarchy, HTTP discovery/call, MCP discovery/call, and compatibility alias all pass before migrating the rest.

After the tracer bullet, migrate the existing command tools, then complete File/Directory and Path categories, then expand Process/Exec/System/Network/Archive/Data/Watch/Batch/Util.

## Current Baseline / Known Debt

- `source/agent/zero-agent` has 0 tests in its production directory.
- `source/apps/agent` duplicates Agent production code and currently has 19/20 passing tests; the failure is an autostart path assertion caused by the duplicate location.
- `source/apps/mcp` contains tests but its package has no `test` script.
- `source/apps/devices` passes 12/12 tests.
- `source/core/zero-core` currently reports 0 tests.
- Command implementations are duplicated between Agent local-tools and `providers/command/runtime`.
- MCP implementations are duplicated between Core and `apps/mcp`.

Success means these duplicate ownership points are removed, not wrapped by another layer.

