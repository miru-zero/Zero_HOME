'use strict';

const CHATGPT_AUTH_RESOURCE_URI = 'ui://zero/chatgpt-auth/v1.html';
const RESOURCE_MIME_TYPE = 'text/html;profile=mcp-app';
const defaultWidgetDomain = 'https://zero.miru.work';

const widgetDomain = (env = process.env) => String(env.ZERO_CHATGPT_WIDGET_DOMAIN || defaultWidgetDomain).replace(/\/$/, '');

const resourceSummary = () => ({
  uri: CHATGPT_AUTH_RESOURCE_URI,
  name: 'Zero ChatGPT Auth Setup',
  description: 'Embedded Zero UI for importing ChatGPT auth fixture input into a local Zero auth store.',
  mimeType: RESOURCE_MIME_TYPE
});

const renderHtml = () => `<!doctype html>
<html lang="en" class="dark">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Zero ChatGPT Auth</title>
  <style>
    /* Component source: M:\AI_ZERO\beautiful-ui atoms/Button, atoms/StatusPill, atoms/Chip, app/globals.css */
    :root { color-scheme: dark; }
    .dark {
      --page: oklch(0.209 0.004 264.477);
      --canvas: oklch(0.231 0.004 264.487);
      --surface: oklch(0.26 0.006 271.191);
      --inset: oklch(0.243 0.004 264.492);
      --hover: oklch(0.289 0.006 271.22);
      --hover-2: oklch(0.318 0.007 274.747);
      --ink: oklch(0.964 0.002 247.839);
      --ink-2: oklch(0.731 0.008 260.731);
      --ink-3: oklch(0.541 0.01 264.484);
      --line: oklch(0.308 0.006 258.354);
      --line-strong: oklch(0.356 0.007 264.474);
      --field: oklch(0.293 0.006 271.223);
      --accent: oklch(0.68 0.173 253.301);
      --accent-ink: oklch(0.788 0.113 248.33);
      --accent-tint: oklch(0.68 0.173 253.301 / 0.16);
      --green: oklch(0.705 0.154 153.814);
      --green-tint: oklch(0.705 0.154 153.814 / 0.14);
      --orange: oklch(0.746 0.156 55.642);
      --orange-tint: oklch(0.746 0.156 55.642 / 0.14);
      --red: oklch(0.666 0.18 21.433);
      --red-tint: oklch(0.666 0.18 21.433 / 0.14);
      --shadow-btn: 0 0 0 1px oklch(1 0 0 / 0.1), 0 1px 2px oklch(0 0 0 / 0.3);
      --shadow-card: 0 0 0 1px oklch(1 0 0 / 0.11), 0 1px 2px oklch(0 0 0 / 0.2), 0 2px 6px oklch(0 0 0 / 0.2);
      --shadow-raised: 0 0 0 1px oklch(1 0 0 / 0.13), 0 2px 10px oklch(0 0 0 / 0.22);
      --shadow-overlay: 0 0 0 1px oklch(1 0 0 / 0.15), 0 8px 28px oklch(0 0 0 / 0.34);
      --shadow-inset-field: inset 0 1px 2px oklch(0 0 0 / 0.4);
    }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: var(--page); color: var(--ink); }
    main { min-height: 100vh; padding: 18px; background: radial-gradient(circle at 0 0, oklch(0.746 0.156 55.642 / 0.11), transparent 34%), radial-gradient(circle at 100% 0, oklch(0.68 0.173 253.301 / 0.18), transparent 32%), var(--page); }
    .shell { max-width: 880px; margin: 0 auto; border-radius: 24px; background: var(--canvas); box-shadow: var(--shadow-overlay); overflow: hidden; }
    .topbar { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 16px 18px; border-bottom: 1px solid var(--line); }
    .brand { display: flex; min-width: 0; align-items: center; gap: 12px; }
    .logo { width: 38px; height: 38px; border-radius: 12px; display: grid; place-items: center; background: linear-gradient(135deg, #ff1ab3, #19d8ff); box-shadow: 0 0 0 1px oklch(1 0 0 / 0.16), 0 10px 24px oklch(0 0 0 / 0.32); font-size: 22px; font-weight: 900; letter-spacing: -0.08em; }
    h1 { margin: 0; font-size: 17px; line-height: 1.15; letter-spacing: -0.01em; }
    .sub { margin: 4px 0 0; color: var(--ink-2); font-size: 12.5px; line-height: 1.45; }
    .content { display: grid; gap: 14px; padding: 16px; }
    .card { border-radius: 18px; background: var(--surface); box-shadow: var(--shadow-card); }
    .card-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 14px 14px 0; }
    .label-stack { display: grid; gap: 3px; }
    label, .label { color: var(--ink); font-size: 13px; font-weight: 650; }
    .muted { color: var(--ink-3); font-size: 12px; line-height: 1.45; }
    .status-line { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
    .status-pill { display: inline-flex; height: 24px; align-items: center; gap: 6px; border-radius: 999px; padding: 0 10px; font-size: 13px; font-weight: 600; line-height: 1; background: var(--orange-tint); color: var(--orange); }
    .status-pill::before { content: ''; width: 6px; height: 6px; border-radius: 999px; background: currentColor; }
    .status-pill.ok { background: var(--green-tint); color: var(--green); }
    .status-pill.warn { background: var(--orange-tint); color: var(--orange); }
    .status-pill.bad { background: var(--red-tint); color: var(--red); }
    .chip, code { display: inline; border-radius: 7px; background: var(--inset); color: var(--ink-2); padding: 2px 6px; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; line-height: 1; }
    .field-wrap { padding: 12px 14px 14px; }
    textarea { width: 100%; min-height: 230px; resize: vertical; border: 1px solid var(--line-strong); border-radius: 16px; background: var(--inset); color: var(--ink); box-shadow: var(--shadow-inset-field); padding: 13px 14px; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12.5px; line-height: 1.5; outline: none; }
    textarea::placeholder { color: var(--ink-3); }
    textarea:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-tint), var(--shadow-inset-field); }
    .row { display: flex; flex-wrap: wrap; gap: 9px; align-items: center; padding: 0 14px 14px; }
    .btn { display: inline-flex; align-items: center; justify-content: center; gap: 7px; border: 0; border-radius: 999px; padding: 9px 14px; font-size: 13px; font-weight: 650; line-height: 1; cursor: pointer; user-select: none; transition: transform 150ms ease-out, background-color 150ms ease-out, opacity 150ms ease-out; }
    .btn:active { transform: scale(0.96); }
    .btn:disabled { opacity: 0.5; pointer-events: none; }
    .primary { background: var(--accent); color: white; box-shadow: inset 0 1px 0 rgba(255,255,255,0.14); }
    .primary:hover { background: var(--accent-ink); }
    .ghost { background: var(--surface); color: var(--ink); box-shadow: var(--shadow-btn); }
    .ghost:hover { background: var(--hover); }
    .hint { color: var(--ink-3); font-size: 12px; line-height: 1.5; padding: 0 14px 14px; margin: 0; }
    .fineprint { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
  </style>
</head>
<body>
<main>
  <section class="shell">
    <header class="topbar">
      <div class="brand">
        <div class="logo" aria-hidden="true">Z</div>
        <div>
          <h1>Zero ChatGPT Auth Setup</h1>
          <p class="sub">Embedded action UI using Beautiful UI component patterns.</p>
        </div>
      </div>
      <span class="status-pill warn">setup</span>
    </header>
    <div class="content">
      <section class="card" aria-label="Auth status">
        <div class="card-head">
          <div class="label-stack">
            <span class="label">Auth fixture status</span>
            <span class="muted">Raw input is never returned to chat; Zero Core returns redacted metadata only.</span>
          </div>
          <div class="status-line"><span id="status" class="status-pill warn">Waiting for setup context…</span></div>
        </div>
        <p class="hint fineprint"><span class="chip">inline</span><span class="chip">mcp-app</span><span class="chip">redacted</span></p>
      </section>
      <section class="card" aria-label="Auth input">
        <div class="card-head">
          <div class="label-stack">
            <label for="authInput">Paste test JSON/text</label>
            <span class="muted">Current slice writes <code>auth.json</code>. Live retoken, sentinel, and capability probes stay off.</span>
          </div>
        </div>
        <div class="field-wrap">
          <textarea id="authInput" spellcheck="false" autocomplete="off" placeholder='{ "test": true }'></textarea>
        </div>
        <div class="row">
          <button id="submit" class="btn primary" type="button">Write auth.json</button>
          <button id="refresh" class="btn ghost" type="button">Refresh status</button>
        </div>
      </section>
    </div>
  </section>
</main>
<script>
(() => {
  const statusEl = document.getElementById('status');
  const inputEl = document.getElementById('authInput');
  const submitEl = document.getElementById('submit');
  const refreshEl = document.getElementById('refresh');
  let toolInput = null;

  const setStatus = (text, cls = 'warn') => {
    statusEl.className = 'status-pill ' + cls;
    statusEl.textContent = text;
  };

  const readToolInput = () => {
    if (window.openai && window.openai.toolInput) return window.openai.toolInput;
    return toolInput;
  };

  const callTool = async (name, args) => {
    if (window.openai && typeof window.openai.callTool === 'function') {
      return window.openai.callTool(name, args || {});
    }
    throw new Error('MCP Apps bridge is not ready');
  };

  const normalizeResult = (result) => {
    if (!result) return null;
    if (result.structuredContent) return result.structuredContent;
    if (result.content && result.content[0] && result.content[0].text) {
      try { return JSON.parse(result.content[0].text); } catch { return result; }
    }
    return result;
  };

  const currentTicket = () => {
    const input = readToolInput();
    return input && input.setup ? input.setup.ticket : null;
  };

  const refresh = async () => {
    try {
      const result = normalizeResult(await callTool('zero.chatgpt.auth.status', {}));
      const auth = result && result.auth ? result.auth : {};
      const state = auth.present ? 'present / ' + auth.status : 'missing';
      setStatus('Auth status: ' + state + ' (redacted)', auth.present ? 'ok' : 'warn');
    } catch (error) {
      setStatus('Status check failed: ' + (error.message || String(error)), 'bad');
    }
  };

  const submit = async () => {
    const text = inputEl.value.trim();
    if (!text) {
      setStatus('Paste JSON/text before submitting.', 'bad');
      return;
    }
    const ticket = currentTicket();
    if (!ticket) {
      setStatus('Missing setup ticket. Start again from zero.chatgpt.login.', 'bad');
      return;
    }
    submitEl.disabled = true;
    setStatus('Writing auth.json through Zero action…', 'warn');
    try {
      const result = normalizeResult(await callTool('zero.chatgpt.auth.import', { ticket, input: text }));
      const auth = result && result.auth ? result.auth : {};
      setStatus('Write complete: ' + (auth.status || 'ok') + ' / redacted', 'ok');
      inputEl.value = '';
    } catch (error) {
      setStatus('Write failed: ' + (error.message || String(error)), 'bad');
    } finally {
      submitEl.disabled = false;
    }
  };

  window.addEventListener('message', (event) => {
    const msg = event.data || {};
    if (msg.method === 'ui/notifications/tool-input' && msg.params) {
      toolInput = msg.params;
      setStatus('Setup context received. Paste input when ready.', 'warn');
    }
    if (msg.method === 'ui/notifications/tool-result' && msg.params) {
      const data = normalizeResult(msg.params);
      if (data && data.auth) setStatus('Auth status: ' + data.auth.status + ' (redacted)', data.auth.present ? 'ok' : 'warn');
    }
  });

  submitEl.addEventListener('click', submit);
  refreshEl.addEventListener('click', refresh);

  const initial = readToolInput();
  if (initial && initial.setup && initial.setup.ticket) {
    setStatus('Setup context ready. Paste input when ready.', 'warn');
  }
  refresh();
})();
</script>
</body>
</html>`;

const listResources = () => ({ resources: [resourceSummary()] });

const readResource = (uri, options = {}) => {
  if (uri !== CHATGPT_AUTH_RESOURCE_URI) {
    const error = new Error('unknown resource: ' + uri);
    error.code = 'UNKNOWN_RESOURCE';
    throw error;
  }
  const domain = widgetDomain(options.env || process.env);
  const csp = {
    connectDomains: [domain],
    resourceDomains: [domain],
    frameDomains: [domain],
    redirectDomains: []
  };
  return {
    contents: [
      {
        uri: CHATGPT_AUTH_RESOURCE_URI,
        mimeType: RESOURCE_MIME_TYPE,
        text: renderHtml(),
        _meta: {
          ui: {
            domain,
            prefersBorder: true,
            csp
          },
          'openai/ui': {
            availableDisplayModes: ['inline']
          },
          'openai/widgetDescription': 'Zero ChatGPT auth setup embedded UI.',
          'openai/widgetPrefersBorder': true,
          'openai/widgetCSP': {
            connect_domains: csp.connectDomains,
            resource_domains: csp.resourceDomains
          },
          'openai/widgetDomain': domain
        }
      }
    ]
  };
};

const appResource = {
  CHATGPT_AUTH_RESOURCE_URI,
  RESOURCE_MIME_TYPE,
  resourceSummary,
  renderHtml,
  listResources,
  readResource,
  widgetDomain
};

Object.assign(exports, appResource);
