# Agent Layer

`source/agent/zero-agent` is the machine-side executor.

## Owns

- Device setup/pairing local state
- Heartbeat/capability reports to Core
- Task polling from Core
- Canonical command execution under allowed roots
- Local path policy and command safety checks

## Connects to

- Core `/devices/register`
- Core `/devices/{device_id}/heartbeat`
- Core `/devices/{device_id}/capabilities`
- Core task next/result routes
- `source/packages/zero` contracts

## Must not own

- Public MCP endpoint
- ChatGPT app/plugin package identity
- Server-side device registry ownership
- OAuth authorization server

## Validation

```powershell
cd M:\Zero_HOME\source\agent\zero-agent
npm test
npm run doctor
```
