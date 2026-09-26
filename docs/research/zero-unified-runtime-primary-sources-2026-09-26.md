# Research: Zero unified runtime foundations

Date: 2026-09-26

## Question

How should Zero unify its library/runtime, CLI, HTTP host, MCP exposure, and remote agent without duplicating tool logic?

## Primary-source findings

1. Node.js recommends the `exports` field for modern packages. It can expose a small, explicit public surface while keeping implementation subpaths private. This supports making Zero a library first, with CLI/MCP/HTTP/agent as adapters over the same exported runtime.
   Source: https://nodejs.org/api/packages.html

2. Node.js `child_process.spawn(command, args, options)` keeps the executable separate from the argument array, and `shell` defaults to `false`. This supports a Zero execution adapter that accepts semantic arguments and only opts into `cmd`, PowerShell, bash, etc. explicitly.
   Source: https://nodejs.org/api/child_process.html

3. MCP `tools/list` is the protocol discovery mechanism. Current MCP documentation recommends deterministic tool ordering for cacheability, and current SDKs aggregate paginated tool listings for clients.
   Sources: https://modelcontextprotocol.io/specification/draft/changelog and https://ts.sdk.modelcontextprotocol.io/v2/api/%40modelcontextprotocol/client/client/client.html

4. MCP SDKs support filtering advertised tools per request, including trimming a large catalog to a relevant subset. This supports provider/category/target-scoped MCP exposure without changing canonical tool identity.
   Source: https://java.sdk.modelcontextprotocol.io/latest-snapshot/server/

## Repository findings

- `source/agent/zero-agent` and `source/apps/agent` contain identical production files; only the former has `package-lock.json` while the latter contains tests. They are duplicate ownership of one package.
- `source/providers/command/runtime/index.js` and `source/agent/zero-agent/src/local-tools.js` independently implement the same filesystem capability family and root-policy logic.
- `source/core/zero-core/src/api/mcp.js` hard-codes MCP tool definitions while `source/apps/mcp/src/protocol.js` dynamically derives tools from provider catalogs. These are two MCP implementations with different behavior.
- `source/core/zero-core/src/api/server.js` directly hosts MCP, devices, tools, and public HTTP, while `source/apps/gateway`, `source/apps/mcp`, and `source/apps/devices` split the same concerns into separate processes. Both architectures currently coexist.
- `source/apps/devices` has stronger service-owned tests and common HTTP/error handling than the legacy device logic embedded in `zero-core`.

## Recommendation

Create one Zero runtime/library as the source of truth for catalog, dispatch, policy, target routing, and provider invocation. CLI, HTTP host, MCP, and the remote agent should be adapters over that runtime, not independent implementations. Keep deployable processes separate only where isolation or remote placement requires it; do not duplicate domain/tool logic between them.

## 2026-09-26 final architecture research update

5. MCP 2026-07-28 moved the protocol core to stateless requests, removed the old initialize/initialized session handshake, added header-based routing, and made list results explicitly cacheable. Zero should therefore keep MCP-version behavior inside `source/apps/mcp`; neither Core nor Agent should encode MCP protocol state.
   Source: https://blog.modelcontextprotocol.io/posts/2026-07-28/

6. The MCP Tasks extension now models long-running execution as explicit task handles with `tasks/get`, `tasks/update`, and `tasks/cancel`. Zero's own device-task state can remain an internal execution contract, while the MCP app translates to/from MCP task semantics when that protocol version is enabled.
   Source: https://tasks.extensions.modelcontextprotocol.io/specification/draft/tasks

7. The current repository baseline confirms this separation is necessary: `core/zero-core/src/api/mcp.js` and `apps/mcp/src/protocol.js` are competing protocol implementations, while `agent/src/local-tools.js` and `providers/command/runtime/index.js` are competing command implementations. The migration should remove both duplications rather than add another wrapper layer.

8. `@miruzero/zero-agent` is independently published and runs on remote machines. Any shared contract used by Core, Apps, and Agent must therefore be distributable/versioned independently of the monorepo path. A source-only sibling import is not a valid remote deployment contract.

## Final research conclusion

Use one versioned Zero contract/catalog package, keep execution implementation owned by Agent, keep protocol adaptation owned by Apps, and keep routing/orchestration owned by Core. Migrate in vertical Core+App+Agent slices so no phase leaves one side speaking a contract the others do not understand.
