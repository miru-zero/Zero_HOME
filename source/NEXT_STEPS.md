# Zero Source Next Steps

This is the intended order of work after the source relogic.

## 1. Keep tools stable before OAuth

Do not add OAuth until the tool surface and device routing are stable. Current private-test mode uses no OAuth and relies on private app access, paired devices, and path policy.

## 2. Finish Agent package release

`@miruzero/zero-agent` has local version `0.3.5`. npm publish was blocked by OTP. Publish manually from the owner machine:

```powershell
cd M:\Zero_HOME\source\agent\zero-agent
npm publish --access public
```

Do not request or paste OTP in chat.

## 3. Upgrade TON later

MiruZero runs the new canonical agent path. TON still needs the new agent after package publish.

## 4. Package extraction

`miru-zero/Zero-Core` is private and exported, but not standalone. Before it becomes standalone, replace monorepo-relative imports with explicit package/workspace dependencies.

Required packages/layers to extract or publish:

- `source/packages/zero`
- command provider contract/runtime strategy
- devices provider contract/runtime strategy
- agent command library dependency strategy

## 5. OAuth phase

OAuth belongs at the Core boundary, not Agent and not a local plugin wrapper.

Planned scopes:

```text
zero:read
zero:write
zero:devices
zero:admin
```

Required Core endpoints later:

```text
/.well-known/oauth-protected-resource
/.well-known/oauth-authorization-server
/oauth/authorize
/oauth/token
```

## 6. Documentation upkeep

When changing a layer, update the nearest README plus `source/CONNECTION_MAP.md` if a connection point changes.
