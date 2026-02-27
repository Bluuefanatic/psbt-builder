#!/usr/bin/env node
import http from 'node:http';
import { URL } from 'node:url';
import { buildTransactionReport } from './build.js';
import { BuilderError } from './errors.js';

const PORT = Number(process.env.PORT ?? 3000);

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(body.length ? JSON.parse(body) : {});
      } catch {
        reject(new BuilderError('INVALID_JSON', 'Request body must be valid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' });
  res.end(`${JSON.stringify(payload)}\n`);
}

function htmlPage() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Coin Smith Builder</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 24px; max-width: 980px; }
    h1 { margin-bottom: 12px; }
    textarea { width: 100%; min-height: 220px; font-family: monospace; }
    button { margin-top: 12px; padding: 8px 14px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px; }
    .card { border: 1px solid #d0d0d0; border-radius: 8px; padding: 12px; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; background: #ececec; font-size: 12px; }
    .change { background: #d7f2ff; }
    ul { padding-left: 18px; }
    .mono { font-family: monospace; font-size: 12px; }
    .warn { color: #8a4b00; }
  </style>
</head>
<body>
  <h1>Coin Smith PSBT Builder</h1>
  <p>Paste a fixture JSON and click <strong>Build Transaction</strong>.</p>
  <textarea id="fixtureInput" placeholder='{"network":"mainnet", ...}'></textarea>
  <br />
  <button id="buildBtn">Build Transaction</button>
  <p id="status"></p>

  <div class="grid">
    <div class="card">
      <h3>Summary</h3>
      <div id="summary"></div>
    </div>
    <div class="card">
      <h3>Warnings</h3>
      <ul id="warnings"></ul>
    </div>
    <div class="card">
      <h3>Selected Inputs</h3>
      <ul id="inputs"></ul>
    </div>
    <div class="card">
      <h3>Outputs</h3>
      <ul id="outputs"></ul>
    </div>
  </div>

  <script>
    const fixtureInput = document.getElementById('fixtureInput');
    const buildBtn = document.getElementById('buildBtn');
    const statusEl = document.getElementById('status');
    const summaryEl = document.getElementById('summary');
    const warningsEl = document.getElementById('warnings');
    const inputsEl = document.getElementById('inputs');
    const outputsEl = document.getElementById('outputs');

    function li(text, className = '') {
      const item = document.createElement('li');
      item.textContent = text;
      if (className) item.className = className;
      return item;
    }

    buildBtn.addEventListener('click', async () => {
      statusEl.textContent = 'Building...';
      warningsEl.innerHTML = '';
      inputsEl.innerHTML = '';
      outputsEl.innerHTML = '';
      summaryEl.innerHTML = '';

      try {
        const fixture = JSON.parse(fixtureInput.value);
        const response = await fetch('/api/build', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(fixture),
        });
        const report = await response.json();

        if (!response.ok || report.ok === false) {
          statusEl.textContent = `Error: ${report.error?.code ?? 'BUILD_FAILED'} - ${report.error?.message ?? 'Unknown error'}`;
          return;
        }

        statusEl.textContent = 'Success';

        summaryEl.innerHTML = `
          <p><strong>Total Inputs:</strong> ${report.selected_inputs.length}</p>
          <p><strong>Total Outputs:</strong> ${report.outputs.length}</p>
          <p><strong>Fee:</strong> ${report.fee_sats} sats</p>
          <p><strong>Fee Rate:</strong> ${report.fee_rate_sat_vb} sat/vB</p>
          <p><strong>RBF Enabled:</strong> ${report.rbf_enabled}</p>
          <p><strong>Locktime:</strong> ${report.locktime} (${report.locktime_type})</p>
        `;

        if (report.warnings.length === 0) {
          warningsEl.appendChild(li('None'));
        } else {
          report.warnings.forEach((warning) => warningsEl.appendChild(li(warning.code, 'warn')));
        }

        report.selected_inputs.forEach((input) => {
          inputsEl.appendChild(li(`${input.value_sats} sats | ${input.txid}:${input.vout}`));
        });

        report.outputs.forEach((output) => {
          const label = output.is_change
            ? `[CHANGE] ${output.value_sats} sats | ${output.script_type}`
            : `${output.value_sats} sats | ${output.script_type}`;
          outputsEl.appendChild(li(label, output.is_change ? 'change badge' : ''));
        });
      } catch (error) {
        statusEl.textContent = `Error: ${error.message}`;
      }
    });
  </script>
</body>
</html>`;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'GET' && url.pathname === '/api/health') {
    return sendJson(res, 200, { ok: true });
  }

  if (req.method === 'POST' && url.pathname === '/api/build') {
    try {
      const fixture = await readJsonBody(req);
      const report = buildTransactionReport(fixture);
      return sendJson(res, 200, report);
    } catch (error) {
      const payload = error instanceof BuilderError
        ? { ok: false, error: { code: error.code, message: error.message } }
        : { ok: false, error: { code: 'BUILD_FAILED', message: error instanceof Error ? error.message : 'Unknown error' } };
      return sendJson(res, 400, payload);
    }
  }

  if (req.method === 'GET' && url.pathname === '/') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(htmlPage());
    return;
  }

  sendJson(res, 404, { ok: false, error: { code: 'NOT_FOUND', message: 'Route not found' } });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`http://127.0.0.1:${PORT}`);
});
