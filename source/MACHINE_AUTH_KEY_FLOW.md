# Machine Auth Key Flow

This document describes the safe model for a per-machine auth key used by Zero.

The goal is to allow only a real connected ChatGPT MCP app/plugin to activate or use a paired machine, without exposing raw secrets to prompts or transcripts.

## Principle

A machine auth key is a secret. It must be handled as credential material, not as normal AI text.

```text
ChatGPT MCP Connector
        ↓ authenticated request / connector consent
Zero Core Secret Boundary
        ↓ device registry validation
Zero Agent Machine Key
```

## Correct flow

1. User connects the real ChatGPT MCP connector.
2. User explicitly consents to use Zero.
3. Zero Core creates or accepts a pairing intent.
4. Machine/Agent obtains or proves possession of a device key through a secret path.
5. Core stores only the required secret material or a hash/reference.
6. AI receives only redacted status.

## What AI can see

AI can see:

```json
{
  "device": "MiruZero",
  "auth": "present",
  "status": "online",
  "scope": ["zero:read", "zero:write", "zero:devices"]
}
```

AI must not see:

```json
{
  "device_auth_key": "raw-secret-value"
}
```

## Proposed status values

| Status | Meaning | Safe to show AI? |
| --- | --- | --- |
| `missing` | No key exists for this machine. | Yes |
| `present` | Key exists but is not revealed. | Yes |
| `invalid` | Key failed validation. | Yes |
| `expired` | Key exists but must be rotated. | Yes |
| `rotated` | Key was replaced. | Yes |
| `redacted` | A secret field was intentionally hidden. | Yes |

## Proposed API shape

Do not implement this as a normal chat value. Implement it as a Core-controlled action.

```text
POST /devices/{device_id}/auth/key
Authorization: OAuth or admin/device pairing token
Body: credential material through approved secret channel
Response: redacted status only
```

Response example:

```json
{
  "ok": true,
  "device_id": "dev_xxx",
  "auth": "present",
  "redacted": true,
  "rotated_at": "2026-09-27T20:19:00+07:00"
}
```

## MCP tool rule

A future MCP tool may help create or verify the key, but it must never return the raw key.

Allowed tool names:

```text
zero.devices.auth.status
zero.devices.auth.beginPairing
zero.devices.auth.rotate
zero.devices.auth.revoke
```

Forbidden behavior:

```text
zero.devices.auth.getKey
zero.devices.auth.printKey
zero.devices.auth.exportKey
```

## Storage rule

Store secrets outside normal repository files.

Allowed:

```text
Core runtime secret store
OS credential vault
Encrypted device registry secret field
```

Not allowed:

```text
README.md
source/**/*.md
runtime/*.json committed to git
logs/*.log
chat transcript
```

## Runtime enforcement probe

The live enforcement probe is:

```text
zero.qa.auth.requireMachineAuth
```

This probe intentionally asks Core for a machine-auth protected path. If the connector has not supplied valid machine auth, Core must return `AUTH_REQUIRED`; it must not accept a raw key typed into chat.
