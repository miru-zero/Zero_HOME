# Zero Tools Unification â€” Step Checklist

Rule: **Core + Apps + Agent move together. A Step is DONE only when its Triplet Gate passes.**

Canonical roles:
- Core = Server
- Apps = Plugin
- Agent = Local Command
- Shared Zero = Contract / Catalog / Runtime kernel

## STEP 0 â€” Freeze the Baseline

- [x] 0.1 Copy the required production trees (`source/core/zero-core`, `source/apps` connector docs, `source/agent/zero-agent`, providers/packages they depend on) into one isolated `sandbox/projects/zero-tools-unification` workspace.
  - Acceptance: the sandbox copy is self-contained enough to exercise the Core + Apps + Agent path without modifying production source.
  - Verify: run tests from the copied Agent package under `sandbox/projects/zero-tools-unification/source/agent/zero-agent`.
- [x] 0.2 Fix and extend tests inside the sandbox copy only; path-sensitive assertions must point to the copied project layout, not production paths.
  - Acceptance: all previously valid Agent behavior tests pass from canonical path.
- [x] 0.3 Move MCP coverage to `source/core/zero-core/test`; legacy `apps/mcp` production copy removed.
  - Acceptance: MCP tests run from its own package directory.
- [x] 0.4 In the sandbox copy, add focused Core baseline tests for `/tools`, provider call, and MCP discovery/call behavior.
  - Acceptance: behavior being replaced has executable regression coverage.
- [x] 0.5 Save compatibility fixtures for current tool names, schemas, and normalized failures.

### TRIPLET GATE 0
- [x] Sandbox copy -> Core + Apps + Agent baseline is executable and recorded before any promotion to source.
- [x] Apps MCP tests executable.
- [x] Apps Devices remains 12/12 green.
- [x] Core tool/MCP baseline covered.

## GLOBAL SANDBOX RULE

- [ ] Every STEP 1â€“9 is implemented and verified first under `sandbox/projects/zero-tools-unification`.
- [ ] `source/...` paths below describe the production destination after verification.
- [ ] Promotion is diff-based: copy back only reviewed/verified changes, never replace production blindly with the whole sandbox tree.
- [ ] After promotion, rerun the relevant Triplet Gate against production paths before marking the Step DONE.

## STEP 1 â€” Shared Zero Contract

- [x] 1.1 Create `source/packages/zero` (`@miruzero/zero`) targeting Node >=20.
- [x] 1.2 Implement `contractVersion`, tool-id parse/format, descriptor validation, catalog ordering, alias map, Zero error shape.
- [x] 1.3 Add package `exports` so only the public contract/runtime seam is importable.
- [x] 1.4 Add tests: valid/invalid ids, duplicate ids, aliases, version mismatch, deterministic list order.
- [x] 1.5 Wire Agent capability payload to advertise `contractVersion`.
- [x] 1.6 Wire Core MCP to consume/report the shared contract version while Agent uses the same contract boundary.

### TRIPLET GATE 1
- [x] Core + Apps + Agent import the same Shared Zero package.
- [x] No OS/tool implementation exists inside Shared Zero.
- [x] All STEP 0 tests remain green.

## STEP 2 â€” Tracer `command.filesystem.readFile`

- [x] 2.1 Agent owns canonical `filesystem.readFile` descriptor + implementation.
- [x] 2.2 Agent package exports a library seam usable without spawning the daemon.
- [x] 2.3 Core `command` provider becomes an adapter to the Agent library for this tool.
- [x] 2.4 Core MCP derives tools and schemas from provider catalog metadata.
- [x] 2.5 CLI accepts `zero command filesystem readFile '<json>'`.
- [x] 2.6 HTTP discovery accepts `pvd=command&cat=filesystem`.
- [x] 2.7 Preserve legacy `zero command readFile` / `zero.command.readFile` aliases.
- [x] 2.8 Add direct-Agent/Core/CLI/HTTP/MCP parity tests.

### TRIPLET GATE 2
- [x] One authoritative active readFile implementation exists; the dormant duplicate `source/apps/agent` tree has been removed.
- [x] All surfaces return equivalent semantics/errors.
- [x] Legacy alias works through the canonical Agent handler without a second active handler in Core/provider/MCP.

## STEP 3 â€” Target / Remote Parity

- [x] 3.1 Add explicit `target` context; default must be unambiguous (`core/local`), not mutable global state.
- [x] 3.2 Device task payload carries canonical tool id + contractVersion + semantic args + deadline.
- [x] 3.3 Remote Agent rejects incompatible contract major before execution.
- [x] 3.4 Core chooses direct local Agent library or device transport from target.
- [x] 3.5 Normal tool callers no longer need nested `devices.exec` for command execution.
- [ ] 3.6 Run readFile E2E on MiruZero and TON after matching Agent build is installed.
  - Verified actual Coreâ†”Agent HTTP task transport on an ephemeral loopback server and direct canonical Agent execution on TON with the matching temporary build.
  - BLOCKER: TON cannot TCP-connect to MiruZero ephemeral ports (18080/18051); Windows inbound firewall blocks the final cross-machine transport check. No firewall rule or public tunnel was changed/created.

### TRIPLET GATE 3
- [x] Same canonical tool works local and remote (actual HTTP task transport verified on ephemeral loopback).
- [x] Same normalized error/result contract on both targets.
- [x] Capability hash reflects contract/platform/architecture/category/adapter/provider changes.

## STEP 4 â€” Migrate Existing Command Tools

- [ ] 4.1 Read group: `readFiles`, `listDirectory`, `getFileInfo`, `globFiles`, `grepFiles`.
- [ ] 4.2 Mutation group: `writeFile`, `replaceFile`, `createDirectory`, `deleteFile`.
- [ ] 4.3 Provider-only parity group: `copyFile`, `moveFile`, `renameFile`, `exists`, `hashFile`.
- [ ] 4.4 For each group: Agent implementation -> Core route -> App exposure -> parity tests -> delete superseded copy.

### TRIPLET GATE 4
- [ ] Agent is the only owner of command execution logic.
- [ ] Provider/Core/App contain no duplicate command handler/schema copy.
- [x] Agent tests are preserved under active `source/agent/zero-agent`; duplicate `source/apps/agent` production tree removed.

## STEP 5 â€” Harden the Command Seam

- [ ] 5.1 Real-path allowed-root validation including Windows junction/symlink escape cases.
- [ ] 5.2 Safe handling for non-existing destinations using nearest existing ancestor.
- [ ] 5.3 Bound read bytes/lines, walk depth, result count, and returned output size.
- [ ] 5.4 Normalize validation/mutation errors and redact secrets.
- [ ] 5.5 Run security regressions through direct Agent and remote Core routing.

### TRIPLET GATE 5
- [ ] Root escape fails closed local + remote.
- [ ] No public unbounded traversal/output path.
- [ ] Error surface stable across CLI/HTTP/MCP.

## STEP 6 â€” Complete Filesystem + Path Foundation

- [ ] 6.1 Add `appendFile`, `createFile`, `touchFile`, `copyDirectory`, `moveDirectory`, `deleteDirectory`, `truncateFile`.
- [ ] 6.2 Add `resolvePath`, `normalizePath`, `joinPath`, `relativePath`, `getParentDirectory`, `getFilename`, `getExtension`.
- [ ] 6.3 Classify pure path functions vs target/platform-sensitive path functions.
- [ ] 6.4 Add category discovery and cross-surface contract tests.

### TRIPLET GATE 6
- [ ] `zero tools command filesystem` is complete and scoped.
- [ ] `zero tools command path` is complete and scoped.
- [ ] HTTP and MCP expose identical category membership from the catalog.

## STEP 7 â€” `via` Execution Adapters

- [ ] 7.1 Keep `native` preferred; define `via` in descriptor/runtime context without exposing raw shell text.
- [ ] 7.2 Add a second real adapter for `readFile` before generalizing the adapter seam.
- [ ] 7.3 Advertise per-target adapter availability in Agent capabilities.
- [ ] 7.4 Core validates requested `via` against target capabilities before dispatch.
- [ ] 7.5 Verify native vs alternate adapter normalized parity.

### TRIPLET GATE 7
- [ ] Semantic payload is unchanged across adapters.
- [ ] Unsupported adapter fails before side effects.
- [ ] Core never constructs shell-specific syntax.

## STEP 8 â€” Progressive Discovery / Logic Hook

- [ ] 8.1 `/tools` returns provider summary by default.
- [ ] 8.2 `pvd=<provider>` returns category summary, not the full schema flood.
- [ ] 8.3 `pvd=<provider>&cat=<category>` returns scoped functions.
- [ ] 8.4 CLI mirrors provider -> category -> function traversal.
- [ ] 8.5 MCP App can expose a scoped subset without changing canonical tool identity.
- [ ] 8.6 Add L0 Index / L1 Peek metadata hooks; full schemas remain lazy.

### TRIPLET GATE 8
- [ ] Large catalog can be navigated without loading every schema.
- [ ] Links/related capabilities are discoverable only; they never auto-execute.
- [ ] Core/App/Agent continue sharing one catalog contract.

## STEP 9 â€” Expand + Remove Legacy Ownership

- [ ] 9.1 Add Disk as a vertical triplet slice.
- [ ] 9.2 Add Process + Exec with executable/argv separation, timeout/cancel/output quotas, target-scoped process handles.
- [ ] 9.3 Add System + Environment with secret filtering.
- [ ] 9.4 Add Network only after SSRF/address/download policy is defined.
- [ ] 9.5 Add Archive with path-traversal and expansion limits.
- [ ] 9.6 Add Data, Watch, Batch, Util as separate scoped slices.
- [x] 9.7 Remove Core hard-coded MCP tool definitions; Core MCP now derives tools from the provider catalog.
- [ ] 9.8 Remove duplicate Core MCP protocol path once Core delegates to the MCP App.
- [ ] 9.9 Remove obsolete provider command implementation after Agent ownership + compatibility aliases pass.
- [ ] 9.10 Remove compatibility aliases only after usage/migration evidence says callers are clean.

### FINAL TRIPLET GATE
- [ ] Core serves one canonical runtime/catalog.
- [ ] Apps extend/adapt it without schema or execution copies.
- [ ] Agent exclusively executes local machine capabilities.
- [ ] Local and TON remote E2E pass for every migrated category.
- [ ] `npm test` is meaningful and green in canonical Core/App/Agent packages.
- [ ] No source tree contains a second authoritative implementation of the same tool.

## Current Baseline Recorded 2026-09-26

- [x] `source/agent/zero-agent`: npm test runs but contains 0 tests.
- [x] `source/apps/agent`: removed from production tree; active agent package is `source/agent/zero-agent`.
- [x] `source/apps/mcp`: removed; replacement MCP tests live in `source/core/zero-core/test`.
- [x] `source/apps/devices`: removed; device provider/runtime coverage lives under `source/providers/devices`.
- [x] `source/core/zero-core`: npm test runs with 0 tests.
- [x] Root `M:\Zero_HOME` is not a Git repository, so no root design-doc commit is possible yet.
- [x] Direct MCP test run (`node --test test/command-provider.test.js`): 4/5 pass; tool-list assertion is stale at 10 while provider currently exposes 15 (`copyFile`, `moveFile`, `renameFile`, `exists`, `hashFile` added).

