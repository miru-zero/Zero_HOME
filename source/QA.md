# Zero Source QA

This QA file is for activation and integration quality checks, not only unit tests.

## QA layers

| QA layer | What it proves |
| --- | --- |
| Connector QA | ChatGPT points to the real Zero MCP endpoint and has the right auth mode. |
| Core QA | Zero Core is healthy and returns MCP tools. |
| Provider QA | Command and devices tools are listed from providers. |
| Agent QA | Paired machines can execute only under allowed roots. |
| Secret QA | Device auth keys are present/valid without exposing raw values. |

## Connector QA

Expected values:

```text
Name: Zero
Server URL: https://zero.miru.work/mcp
Authentication: None for private testing
Future Authentication: OAuth
```

Failure examples:

| Failure | Likely cause |
| --- | --- |
| OAuth screen opens today | Connector auth was set to OAuth before Core OAuth exists. |
| No tools found | Wrong MCP URL or Core is down. |
| Desktop/local plugin opens | Wrong package type; this is not the real ChatGPT MCP connector. |

## Core QA

Run:

```powershell
Invoke-RestMethod http://127.0.0.1:8050/health
```

Expected:

```json
{ "ok": true, "service": "zero-core" }
```

## MCP QA

Call `tools/list` and verify:

```text
helper tools: 2
command tools: 29
devices tools: 4
total tools: 35
```

## Secret QA

A valid QA result must prove that a machine key exists without printing it.

Good result:

```json
{
  "device": "MiruZero",
  "auth": "present",
  "redacted": true
}
```

Bad result:

```json
{
  "device_auth_key": "raw-secret-value"
}
```

## Current limitation

OAuth and machine auth-key management are design targets. Current private testing still uses `Authentication=None` at the ChatGPT connector and device tokens in Core/Agent runtime.

## Live auth gate QA tool

Core exposes a runtime QA tool:

```text
zero.qa.auth.requireMachineAuth
```

Expected behavior:

| Call state | Expected result |
| --- | --- |
| No auth context | MCP error with `AUTH_REQUIRED` and a `wwwAuthenticate` hint. |
| Valid machine auth context | Success with redacted auth status only. |
| Raw secret in chat | Invalid test pattern; raw machine keys must not be pasted into chat. |

This proves the QA flow is active at runtime. It does not prove OAuth is complete yet; it proves protected flows can fail closed instead of silently running as no-auth.
