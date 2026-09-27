# Core Layer

`source/core/zero-core` is the Zero server boundary.

## Owns

- Public MCP endpoint: `/mcp`
- Tool discovery: `/tools`
- Provider routing through the Core hub
- Device registry routes under `/devices`
- Future OAuth/access-control enforcement

## Connects to

- `source/providers/command` for filesystem/path tool adapter
- `source/providers/devices` for device registry tool adapter
- `source/packages/zero` for contracts/tool IDs
- `source/agent/zero-agent` indirectly through the device registry/task queue

## Must not own

- Local desktop plugin package files
- Codex `.codex-plugin` wrappers
- Machine-local execution outside provider/agent policy
- ChatGPT app-card creation logic

## Validation

```powershell
cd M:\Zero_HOME\source\core\zero-core
npm test
npm start
```
