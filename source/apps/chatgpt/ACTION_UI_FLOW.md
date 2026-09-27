# Zero ChatGPT Connector Action UI Flow

This layer defines the final ChatGPT connector/action-owned UI flow for Zero ChatGPT auth setup.

## Goal

The final UX is not a normal external setup page.
It must be opened from a ChatGPT connector/action flow, similar to embedded setup flows such as API key creation widgets.

```text
ChatGPT connector/action
  -> embedded action-owned UI
  -> user enters/pastes setup input inside that UI
  -> action submits to Zero Core
  -> Zero Core writes auth.json
  -> ChatGPT receives redacted status only
```

## Branding

Use the Zero neon Z icon supplied by the project owner as the action/app icon.

Target asset slot:

```text
source/apps/chatgpt/assets/zero-icon.png
```

The icon should be copied into this path when the connector package or action bundle supports file assets.
## Required behavior

`zero.chatgpt.login` should start the setup flow from ChatGPT only.
It should return a setup action payload or embedded UI descriptor when the connector platform supports it.

Until embedded UI wiring is available, Zero Core may expose a ticketed fallback page for local QA only:

```text
GET /setup/chatgpt-auth?ticket=<one-time-ticket>
POST /setup/chatgpt-auth/submit
```

That fallback page is not the final product UX.
It exists to prove input capture and auth.json writing.

## Secret boundary

Raw session JSON, cookies, tokens, and imported auth payloads must never be returned to ChatGPT text output.

Allowed response shape:

```json
{
  "ok": true,
  "provider": "chatgpt",
  "auth": {
    "present": true,
    "status": "imported-test-fixture",
    "redacted": true
  }
}
```
## Implementation handoff

Current Core backend support:

```text
zero.chatgpt.login
zero.chatgpt.auth.status
GET  /setup/chatgpt-auth
POST /setup/chatgpt-auth/submit
GET  /auth/chatgpt/status
POST /auth/chatgpt/import
```

Current backend scope:

```text
- test input capture
- one-time setup ticket
- dynamic auth path resolution
- auth.json write
- redacted status output
```

Next connector/app layer work:

```text
- add embedded UI action surface
- attach Zero icon asset
- submit input through the action-owned UI
- map submit to Zero Core import endpoint
- keep Core fallback page for QA only
```

## MCP Apps UI/resource layer

Implemented Core resource support:

```text
resources/list
resources/read
ui://zero/chatgpt-auth/v1.html
mimeType: text/html;profile=mcp-app
```

Tool/resource mapping:

```text
zero.chatgpt.login
  _meta.ui.resourceUri = ui://zero/chatgpt-auth/v1.html
  _meta["openai/outputTemplate"] = ui://zero/chatgpt-auth/v1.html

zero.chatgpt.auth.import
  _meta.ui.visibility = ["app"]
```

The embedded app resource renders a Zero-branded setup surface, accepts test JSON/text, calls `zero.chatgpt.auth.import`, and displays only redacted auth status.


## Widget domain requirement

ChatGPT requires each MCP Apps UI template to declare a unique widget/app domain.
Zero declares the domain on the resource content metadata:

```text
_meta.ui.domain
_meta["openai/widgetDomain"]
```

Default domain:

```text
https://zero.miru.work
```

Override for deployment or staging:

```text
ZERO_CHATGPT_WIDGET_DOMAIN=https://<dedicated-zero-widget-domain>
```

The resource also declares CSP metadata through both the current `ui.csp` shape and OpenAI compatibility keys:

```text
_meta.ui.csp
_meta["openai/widgetCSP"]
```

This prevents ChatGPT from warning that the widget domain is missing for `ui://zero/chatgpt-auth/v1.html`.
