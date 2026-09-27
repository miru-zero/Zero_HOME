# Auth Key Boundary

Zero Core is the only server-side boundary that may validate machine/device auth keys.

## Responsibilities

Core owns:

- pairing intent creation
- device registry validation
- auth-key status reporting
- future OAuth resource enforcement
- redacted audit events

Core does not expose:

- raw device keys
- device tokens in logs
- key export through MCP tools
- secrets in Markdown or repository files

## Expected model

```text
ChatGPT MCP Connector consent
        ↓
Zero Core OAuth / secret boundary
        ↓
Device registry
        ↓
Zero Agent proves possession of machine key
```

## Redaction contract

Any Core response involving secrets must use redaction fields.

Example:

```json
{
  "ok": true,
  "device_id": "dev_xxx",
  "auth": "present",
  "secret": "REDACTED",
  "redacted": true
}
```

## Future implementation hooks

Potential Core routes/tools:

```text
POST /devices/{device_id}/auth/pairing
POST /devices/{device_id}/auth/rotate
POST /devices/{device_id}/auth/revoke
GET  /devices/{device_id}/auth/status
```

Potential MCP tools:

```text
zero.devices.auth.status
zero.devices.auth.beginPairing
zero.devices.auth.rotate
zero.devices.auth.revoke
```

These tools may report status. They must not return key material.
