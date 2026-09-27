# Providers Layer

`source/providers` adapts Core hub calls to concrete tool families.

## Active providers

| Provider | Path | Purpose |
| --- | --- | --- |
| `command` | `source/providers/command` | Canonical filesystem/path tools; routes through the agent command library |
| `devices` | `source/providers/devices` | Device list/status/heartbeat/exec tools backed by Core registry |

## Provider rule

Providers are adapters. They should not become duplicate runtimes with their own server process unless a design document explicitly introduces that boundary.

## Connects to

- Core hub loads providers from `provider.json` manifests.
- Command provider reuses `source/agent/zero-agent` command descriptors/execution.
- Devices provider uses `source/core/zero-core/src/core/device-registry.js` directly.

## Validation

```powershell
node --test M:\Zero_HOME\source\providers\command\test\*.test.js
node --test M:\Zero_HOME\source\providers\devices\test\*.test.js
```
