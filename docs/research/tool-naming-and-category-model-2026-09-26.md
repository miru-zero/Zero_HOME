# Zero tool naming and category model

Date: 2026-09-26

## Question

Should Zero expose tools as `zero.<category>.<function>`, and should the current `listZeroTools` become a category-aware `listTools` surface?

## Primary-source findings

1. MCP explicitly allows dot-separated tool names. The 2026-07-28 MCP tools spec says tool names should use ASCII letters, digits, `_`, `-`, and `.`, be unique within a server, and gives `admin.tools.list` as a valid example. This directly supports names such as `zero.filesystem.readFile`.
   Source: https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2026-07-28/server/tools.mdx

2. MCP already has protocol-level discovery via JSON-RPC method `tools/list`; the client does not need a custom tool merely to enumerate the whole server tool surface. The protocol also supports pagination/caching and recommends deterministic ordering.
   Source: https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2026-07-28/server/tools.mdx

3. MCP notes that aggregating tools from multiple servers can create naming collisions and explicitly suggests a disambiguation strategy such as prefixing tool names with a server identifier. That is a strong reason to keep the `zero.` prefix.
   Source: https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2026-07-28/server/tools.mdx

4. OpenAI's current tool-search design has first-class `namespace` objects containing functions, and recommends concise namespace descriptions so the model can load only the relevant subset. This supports category-first organization when the catalog becomes large.
   Source: https://developers.openai.com/api/docs/guides/tools-tool-search
5. OpenAI supports restricting a model to an `allowed_tools` subset without redefining the entire tool universe. This aligns with Zero's planned capability/allowlist policy: the catalog can be broad while the active callable subset stays narrow.
   Source: https://developers.openai.com/api/docs/guides/function-calling

## Recommendation

Use one canonical external grammar:

`zero.<category>.<function>`

Examples:

- `zero.filesystem.readFile`
- `zero.filesystem.createDirectory`
- `zero.path.resolvePath`
- `zero.disk.diskInfo`
- `zero.process.startProcess`
- `zero.exec.execFile`
- `zero.system.hostname`
- `zero.network.httpRequest`
- `zero.archive.zip`
- `zero.data.readJson`
- `zero.watch.watchFile`
- `zero.batch.copyFiles`
- `zero.util.sleep`
- `zero.devices.list`

Keep `command` as an internal implementation/provider if useful, but do not make it the public category for every OS capability. The public name should communicate the capability class and risk domain.
## What to do with `listZeroTools`

Do not rename it to `listTools.<category>` as the canonical callable name, because that reverses the chosen grammar (`function.category` instead of `category.function`) and creates one listing function per category.

Preferred options, in order:

1. Rely on native MCP `tools/list` for complete discovery.
2. If an agent-callable filtered catalog is still useful, expose one custom tool: `zero.tools.list({ category, risk, capability, includeSchemas })`.
3. CLI sugar can be `zero tools <category>` and map internally to the same catalog query.

This preserves one grammar, one source of truth, and a small discovery interface.

## Catalog shape

Each tool should have one canonical descriptor:

```js
{
  id: 'filesystem.readFile',
  externalName: 'zero.filesystem.readFile',
  category: 'filesystem',
  risk: 'read',
  capability: 'filesystem.read',
  schema,
  handler
}
```
Generate MCP exposure, CLI help, filtered listing, policy checks, documentation, and tests from this catalog instead of duplicating tool definitions in `provider` and `api/mcp.js`.

## Final decision

Recommended: **yes to `zero.<category>.<function>`; no to `listTools.<category>` as a separate naming grammar.** Use native MCP `tools/list` for protocol discovery, and only add `zero.tools.list` if Zero needs its own category/risk/capability-aware discovery layer.
