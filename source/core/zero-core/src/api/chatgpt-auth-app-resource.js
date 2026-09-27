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
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Zero ChatGPT Auth</title>
  <style>
    :root { color-scheme: dark; }
    body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #050507; color: #f5f7fb; }
    main { min-height: 100vh; box-sizing: border-box; padding: 22px; background: radial-gradient(circle at 0 0, rgba(255, 0, 170, 0.24), transparent 34%), radial-gradient(circle at 100% 0, rgba(0, 210, 255, 0.22), transparent 32%), #050507; }
    .shell { max-width: 880px; margin: 0 auto; border: 1px solid rgba(255,255,255,0.16); border-radius: 22px; background: rgba(12, 14, 20, 0.9); box-shadow: 0 18px 70px rgba(0,0,0,0.45); overflow: hidden; }
    header { display: flex; gap: 14px; align-items: center; padding: 20px 20px 14px; border-bottom: 1px solid rgba(255,255,255,0.12); }
    .logo { width: 44px; height: 44px; border-radius: 14px; display: grid; place-items: center; background: linear-gradient(135deg, #ff1ab3, #19d8ff); box-shadow: 0 0 26px rgba(255, 20, 190, 0.35), 0 0 36px rgba(0, 210, 255, 0.25); font-size: 26px; font-weight: 900; letter-spacing: -0.08em; }
    h1 { font-size: 18px; margin: 0; }
    .sub { margin: 4px 0 0; color: #b9c0cc; font-size: 13px; }
    .content { padding: 20px; }
    .status { padding: 12px 14px; border-radius: 14px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); color: #d9deea; font-size: 13px; margin-bottom: 16px; }
    label { display: block; font-weight: 700; margin-bottom: 8px; }
    textarea { width: 100%; min-height: 270px; box-sizing: border-box; resize: vertical; border-radius: 16px; border: 1px solid rgba(255,255,255,0.18); background: rgba(0,0,0,0.42); color: #f5f7fb; padding: 14px; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 13px; outline: none; }
    textarea:focus { border-color: rgba(28, 218, 255, 0.76); box-shadow: 0 0 0 4px rgba(28, 218, 255, 0.12); }
    .row { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-top: 14px; }
    button { border: 0; border-radius: 999px; padding: 11px 16px; font-weight: 800; cursor: pointer; }
    .primary { color: #050507; background: linear-gradient(135deg, #ff48c7, #2eeaff); }
    .ghost { color: #eef3ff; background: rgba(255,255,255,0.09); border: 1px solid rgba(255,255,255,0.15); }
    .hint { color: #aeb7c7; font-size: 12px; line-height: 1.5; margin-top: 12px; }
    code { background: rgba(255,255,255,0.08); padding: 2px 6px; border-radius: 7px; }
    .ok { color: #8fffc7; }
    .warn { color: #ffd28f; }
    .bad { color: #ff9ba8; }
  </style>
</head>
<body>
<main>
  <section class="shell">
    <header>
      <div class="logo" aria-hidden="true">Z</div>
      <div>
        <h1>Zero ChatGPT Auth Setup</h1>
        <p class="sub">Connector/action embedded UI. Raw input stays inside this setup action and Zero Core returns redacted status only.</p>
      </div>
    </header>
    <div class="content">
      <div id="status" class="status warn">Waiting for ChatGPT setup context…</div>
      <label for="authInput">Paste test JSON/text</label>
      <textarea id="authInput" spellcheck="false" autocomplete="off" placeholder='{ "test": true }'></textarea>
      <div class="row">
        <button id="submit" class="primary" type="button">Write auth.json</button>
        <button id="refresh" class="ghost" type="button">Refresh status</button>
      </div>
      <p class="hint">Current test slice writes <code>auth.json</code>. Live retoken, sentinel, and capability probes are intentionally not enabled yet.</p>
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
    statusEl.className = 'status ' + cls;
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
