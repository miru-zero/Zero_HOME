# ChatGPT MCP Connector Values

This is the value sheet for adding the real Zero MCP connector in ChatGPT.

## Current private-test values

```text
Name: Zero
Description: Zero MCP Bridge for canonical command and device tools.
Server URL: https://zero.miru.work/mcp
Authentication: None
```

## Values that belong here

| Value | Belongs here? | Reason |
| --- | --- | --- |
| MCP server URL | Yes | ChatGPT needs it to reach Zero Core. |
| Display name | Yes | User-facing connector label. |
| Auth mode | Yes | Defines whether ChatGPT uses None or OAuth. |
| Device auth key | No | Device keys belong to Core/Agent secret handling. |
| Allowed filesystem roots | No | Roots belong to Core/Agent runtime policy. |

## Machine key handling

The connector may trigger a key setup flow, but it must not ask the user to paste raw device keys into the chat.

Safe connector behavior:

```text
Ask Core to begin pairing.
Ask Core to rotate/revoke/check a key.
Display redacted status only.
```

Unsafe connector behavior:

```text
Ask user to paste a key in conversation.
Store keys in plugin package files.
Expose keys in prompt-visible output.
```
