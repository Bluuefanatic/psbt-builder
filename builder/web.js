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
    :root {
      --bg: #f5f7fb;
      --text: #13203a;
      --muted: #5f6b85;
      --card: #ffffff;
      --line: #dbe3f0;
      --accent: #2f6ff4;
      --accent-soft: #e9f0ff;
      --warn-soft: #fff4e6;
      --warn-text: #8a4b00;
      --ok-soft: #e9f9ef;
      --ok-text: #1a6d37;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Inter, Segoe UI, Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.4;
    }
    .container {
      max-width: 1100px;
      margin: 0 auto;
      padding: 24px;
    }
    .hero {
      background: linear-gradient(130deg, #12347a, #2f6ff4);
      color: #fff;
      border-radius: 14px;
      padding: 20px;
      margin-bottom: 16px;
    }
    .hero h1 { margin: 0 0 8px 0; font-size: 30px; }
    .hero p { margin: 0; opacity: 0.95; }
    .card {
      background: var(--card);
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 14px;
      box-shadow: 0 4px 16px rgba(16, 24, 40, 0.04);
    }
    .controls {
      display: grid;
      gap: 10px;
      margin-bottom: 16px;
    }
    textarea {
      width: 100%;
      min-height: 220px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      border: 1px solid var(--line);
      border-radius: 10px;
      padding: 10px;
      resize: vertical;
    }
    button {
      width: max-content;
      border: 0;
      border-radius: 10px;
      padding: 10px 14px;
      font-weight: 600;
      background: var(--accent);
      color: #fff;
      cursor: pointer;
    }
    .status {
      font-size: 14px;
      color: var(--muted);
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      margin-top: 12px;
    }
    .facts {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
      margin-top: 8px;
    }
    .fact {
      border: 1px solid var(--line);
      border-radius: 10px;
      padding: 8px;
      background: #fafcff;
    }
    .fact small { color: var(--muted); display: block; }
    .fact strong { font-size: 16px; }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 12px;
      margin-left: 6px;
      background: #eef2ff;
      color: #2d3f72;
      border: 1px solid #dde5ff;
    }
    .change {
      background: var(--accent-soft);
      color: #1d4fc9;
      border-color: #c7d8ff;
    }
    .warn {
      background: var(--warn-soft);
      color: var(--warn-text);
      border: 1px solid #ffe2be;
      border-radius: 999px;
      padding: 3px 8px;
      display: inline-block;
      margin: 2px 6px 2px 0;
      font-size: 12px;
      font-weight: 600;
    }
    .ok {
      background: var(--ok-soft);
      color: var(--ok-text);
      border: 1px solid #ccefd9;
      border-radius: 999px;
      padding: 3px 8px;
      font-size: 12px;
      font-weight: 600;
    }
    ul { margin: 8px 0 0 18px; padding: 0; }
    li { margin-bottom: 6px; }
    .mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 12px;
      word-break: break-all;
      border: 1px solid var(--line);
      border-radius: 10px;
      padding: 8px;
      background: #fcfdff;
    }
    .flow {
      display: grid;
      grid-template-columns: 1fr auto 1fr auto 1fr;
      align-items: center;
      gap: 8px;
      margin-top: 10px;
    }
    .node {
      border: 1px solid var(--line);
      border-radius: 10px;
      padding: 10px;
      text-align: center;
      background: #fff;
    }
    .arrow {
      font-size: 20px;
      color: var(--muted);
    }
    .explain p {
      margin: 6px 0;
      color: #27375f;
    }
    .small {
      color: var(--muted);
      font-size: 12px;
    }
    @media (max-width: 900px) {
      .grid { grid-template-columns: 1fr; }
      .facts { grid-template-columns: 1fr; }
      .flow { grid-template-columns: 1fr; }
      .arrow { display: none; }
    }
  </style>
</head>
<body>
  <div class="container">
    <section class="hero">
      <h1>Coin Smith PSBT Builder</h1>
      <p>Learn what your wallet is doing: coin selection, payments vs change, fees, warnings, and the PSBT package.</p>
    </section>

    <section class="card controls">
      <strong>1) Load Fixture JSON</strong>
      <span class="small">Use a fixture file or paste JSON directly.</span>
      <input id="fixtureFile" type="file" accept="application/json,.json" />
      <textarea id="fixtureInput" placeholder='{"network":"mainnet", ...}'></textarea>
      <button id="buildBtn">Build Transaction</button>
      <div id="status" class="status">Ready</div>
    </section>

    <section class="card" style="margin-bottom: 12px;">
      <strong>2) Transaction Flow Diagram</strong>
      <div class="flow">
        <div class="node">
          <div><strong>Selected Inputs</strong></div>
          <div id="flowInputs">—</div>
        </div>
        <div class="arrow">→</div>
        <div class="node">
          <div><strong>Payments</strong></div>
          <div id="flowPayments">—</div>
        </div>
        <div class="arrow">→</div>
        <div class="node">
          <div><strong>Change + Fee</strong></div>
          <div id="flowChangeFee">—</div>
        </div>
      </div>
      <p class="small">This shows how wallet funds are split: receiver payments, optional change back to sender, and miner fee.</p>
    </section>

    <section class="grid">
      <article class="card">
        <h3 style="margin: 0 0 8px 0;">Summary</h3>
        <div id="summaryFacts" class="facts"></div>
        <div style="margin-top: 10px;"><strong>PSBT (base64)</strong></div>
        <div id="psbtPreview" class="mono">Build a transaction to preview PSBT.</div>
      </article>

      <article class="card">
        <h3 style="margin: 0 0 8px 0;">Warnings</h3>
        <div id="warnings"></div>
        <div id="explain" class="explain" style="margin-top: 10px;"></div>
      </article>

      <article class="card">
        <h3 style="margin: 0 0 8px 0;">Selected Inputs</h3>
        <span class="small">UTXOs chosen to fund outputs + fee.</span>
        <ul id="inputs"></ul>
      </article>

      <article class="card">
        <h3 style="margin: 0 0 8px 0;">Outputs</h3>
        <span class="small">Payment outputs plus optional change output.</span>
        <ul id="outputs"></ul>
      </article>
    </section>
  </div>

  <script>
    const fixtureFile = document.getElementById('fixtureFile');
    const fixtureInput = document.getElementById('fixtureInput');
    const buildBtn = document.getElementById('buildBtn');
    const statusEl = document.getElementById('status');
    const summaryFactsEl = document.getElementById('summaryFacts');
    const warningsEl = document.getElementById('warnings');
    const inputsEl = document.getElementById('inputs');
    const outputsEl = document.getElementById('outputs');
    const psbtPreviewEl = document.getElementById('psbtPreview');
    const explainEl = document.getElementById('explain');
    const flowInputsEl = document.getElementById('flowInputs');
    const flowPaymentsEl = document.getElementById('flowPayments');
    const flowChangeFeeEl = document.getElementById('flowChangeFee');

    function li(text, className = '') {
      const item = document.createElement('li');
      item.textContent = text;
      if (className) item.className = className;
      return item;
    }

    function fact(label, value) {
      return '<div class="fact"><small>' + label + '</small><strong>' + value + '</strong></div>';
    }

    fixtureFile.addEventListener('change', async (event) => {
      const file = event.target.files && event.target.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        JSON.parse(text);
        fixtureInput.value = text;
        statusEl.textContent = 'Loaded fixture file: ' + file.name;
      } catch (error) {
        statusEl.textContent = 'Error: Invalid JSON file - ' + error.message;
      }
    });

    buildBtn.addEventListener('click', async () => {
      statusEl.textContent = 'Building transaction...';
      warningsEl.innerHTML = '';
      inputsEl.innerHTML = '';
      outputsEl.innerHTML = '';
      summaryFactsEl.innerHTML = '';
      explainEl.innerHTML = '';

      try {
        const fixture = JSON.parse(fixtureInput.value);
        const response = await fetch('/api/build', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(fixture),
        });
        const report = await response.json();

        if (!response.ok || report.ok === false) {
          statusEl.textContent = 'Error: ' + (report.error?.code ?? 'BUILD_FAILED') + ' - ' + (report.error?.message ?? 'Unknown error');
          return;
        }

        statusEl.innerHTML = '<span class="ok">Success</span> Transaction built.';

        const paymentTotal = report.outputs
          .filter((output) => !output.is_change)
          .reduce((sum, output) => sum + output.value_sats, 0);
        const inputTotal = report.selected_inputs
          .reduce((sum, input) => sum + input.value_sats, 0);
        const changeValue = report.change_output ? report.change_output.value_sats : 0;

        summaryFactsEl.innerHTML =
          fact('Total Inputs', report.selected_inputs.length) +
          fact('Total Outputs', report.outputs.length) +
          fact('Fee', report.fee_sats + ' sats') +
          fact('Fee Rate', report.fee_rate_sat_vb + ' sat/vB') +
          fact('Size', report.vbytes + ' vbytes') +
          fact('RBF Signaling', String(report.rbf_signaling));

        if (report.locktime > 0) {
          summaryFactsEl.innerHTML += fact('Locktime', report.locktime + ' (' + report.locktime_type + ')');
        }

        psbtPreviewEl.textContent = report.psbt_base64.slice(0, 160) + '...';

        flowInputsEl.textContent = inputTotal + ' sats';
        flowPaymentsEl.textContent = paymentTotal + ' sats';
        flowChangeFeeEl.textContent = 'change: ' + changeValue + ' | fee: ' + report.fee_sats;

        if (report.warnings.length === 0) {
          warningsEl.innerHTML = '<span class="ok">No warnings</span>';
        } else {
          report.warnings.forEach((warning) => {
            const badge = document.createElement('span');
            badge.className = 'warn';
            badge.textContent = warning.code;
            warningsEl.appendChild(badge);
          });
        }

        const hasSendAll   = report.warnings.some((w) => w.code === 'SEND_ALL');
        const hasDust      = report.warnings.some((w) => w.code === 'DUST_CHANGE');
        const hasHighFee   = report.warnings.some((w) => w.code === 'HIGH_FEE');
        const hasRbf       = report.rbf_signaling;
        const hasLocktime  = report.locktime > 0;

        // Warning annotations shown inline next to each badge
        const warnLabels = {
          RBF_SIGNALING: 'Transaction opts in to Replace-By-Fee (nSequence \u2264 0xFFFFFFFD on every input).',
          SEND_ALL: 'No change output was created \u2014 all leftover sats go to miners as extra fee.',
          DUST_CHANGE: 'Change would have been below 546 sats (dust threshold) so it was burned as fee instead.',
          HIGH_FEE: 'Fee is unusually high (> 1,000,000 sats or rate > 200 sat/vB). Double-check before signing.',
        };

        warningsEl.innerHTML = '';
        if (report.warnings.length === 0) {
          warningsEl.innerHTML = '<span class="ok">No warnings</span>';
        } else {
          report.warnings.forEach((warning) => {
            const wrap = document.createElement('div');
            wrap.style.cssText = 'margin-bottom:6px';
            const badge = document.createElement('span');
            badge.className = 'warn';
            badge.textContent = warning.code;
            const note = document.createElement('span');
            note.style.cssText = 'margin-left:8px;font-size:0.82em;color:#5f6b85';
            note.textContent = warnLabels[warning.code] || '';
            wrap.appendChild(badge);
            wrap.appendChild(note);
            warningsEl.appendChild(wrap);
          });
        }

        let html = '';

        html += "<p><strong>\uD83D\uDCBC What is a wallet tracking?</strong> " +
          "A Bitcoin wallet does not hold coins directly \u2014 it tracks <em>UTXOs</em> (Unspent Transaction Outputs). " +
          "Each UTXO is like a banknote: it has a fixed value and can only be spent whole. " +
          "To make a payment, the wallet <em>selects</em> one or more UTXOs whose combined value covers the amount plus fee.</p>";

        html += "<p><strong>\uD83C\uDFAF Why these inputs?</strong> " +
          "This builder uses a <em>greedy</em> strategy: UTXOs are sorted by value (largest first) and picked one-by-one until the total is enough. " +
          "Selecting fewer, larger UTXOs keeps the transaction small and cheap.</p>";

        html += "<p><strong>\uD83D\uDCB8 Payments vs Change:</strong> " +
          "Outputs are split into two kinds. <em>Payment outputs</em> go to the recipient. " +
          "If the selected inputs are worth more than payment + fee, the leftover returns to the sender as a <em>change output</em> \u2014 " +
          "just like getting coins back after handing over a large banknote.</p>";

        html += "<p><strong>\u26A0\uFE0F Dust rule (546 sats minimum):</strong> " +
          "A UTXO smaller than 546 satoshis is <em>dust</em>. Its value is so tiny that the fee to spend it later would cost more than the output itself. " +
          "Safe wallets refuse to create dust outputs. " +
          (hasDust
            ? "Here, the leftover was below 546 sats, so the change was dropped and folded into the fee (see DUST_CHANGE warning)."
            : "Here, the change of " + changeValue + " sats is safely above that threshold.") + "</p>";

        if (hasSendAll) {
          html += "<p><strong>\uD83D\uDEAB Send-all (no change):</strong> " +
            "There was no leftover after paying outputs + fee, so no change output was created. " +
            "All remaining sats became miner fee. This is flagged as SEND_ALL.</p>";
        } else {
          html += "<p><strong>\u2194\uFE0F Send-all vs creating change:</strong> " +
            "When leftover equals exactly the fee, there is nothing to send back \u2014 the wallet does a <em>send-all</em> and all surplus becomes miner fee. " +
            "This transaction has a change output of " + changeValue + " sats, so send-all did not apply.</p>";
        }

        html += "<p><strong>\uD83D\uDCCF Fee rate \u2192 vbytes \u2192 fee:</strong> " +
          "Bitcoin fees are priced per <em>virtual byte</em> (vbyte) of transaction size. " +
          "Larger transactions (more inputs or outputs) occupy more block space and therefore cost more. " +
          "Formula: <code>fee = \u2308fee_rate \u00D7 vbytes\u2309</code>. " +
          "This transaction is <strong>" + report.vbytes + " vbytes</strong> at <strong>" + report.fee_rate_sat_vb + " sat/vB</strong> = <strong>" + report.fee_sats + " sats</strong> fee. " +
          "Note: adding a change output increases vbytes, which increases the required fee.</p>";

        html += "<p><strong>\uD83D\uDCE6 What is a PSBT?</strong> " +
          "A <em>Partially Signed Bitcoin Transaction</em> (PSBT, BIP-174) is an unsigned transaction bundled with metadata \u2014 " +
          "previous output scripts, amounts, and derivation paths \u2014 needed by a hardware wallet or cold signer to safely verify and sign. " +
          "The builder never touches private keys; it hands the PSBT to the signer. " +
          "The base64 string above is that package.</p>";

        if (hasRbf) {
          html += "<p><strong>\uD83D\uDD04 RBF \u2014 Replace-By-Fee:</strong> " +
            "Replace-By-Fee (BIP-125) lets the sender <em>re-broadcast</em> the same transaction with a higher fee if the original is stuck in the mempool. " +
            "It is signaled by setting each input\u2019s <code>nSequence</code> to <code>0xFFFFFFFD</code> or lower. " +
            "This transaction <strong>does</strong> signal RBF \u2014 every input has nSequence = 0xFFFFFFFD.</p>";
        } else {
          html += "<p><strong>\uD83D\uDD04 RBF \u2014 Replace-By-Fee:</strong> " +
            "Replace-By-Fee lets a sender re-broadcast with a higher fee. " +
            "It is signaled via <code>nSequence \u2264 0xFFFFFFFD</code>. " +
            "This transaction does <strong>not</strong> signal RBF (nSequence = 0xFFFFFFFF), so it cannot be fee-bumped once broadcast.</p>";
        }

        if (hasLocktime) {
          html += "<p><strong>\u23F3 Timelock (nLockTime = " + report.locktime + "):</strong> " +
            "A timelock tells the network: <em>do not mine this transaction before a certain block or time</em>. " +
            "Values below 500,000,000 are <em>block heights</em>; values at or above are <em>Unix timestamps</em>. " +
            "This transaction uses locktime <strong>" + report.locktime + "</strong> (" + report.locktime_type + "), " +
            (report.locktime_type === 'block_height'
              ? "so miners will not include it before block " + report.locktime + "."
              : "so miners will not include it before that Unix timestamp.") +
            " Locktime also enables <em>anti-fee-sniping</em> when set to the current chain tip.</p>";
        } else {
          html += "<p><strong>\u23F3 Timelocks:</strong> " +
            "<code>nLockTime</code> can lock a transaction until a future block height or Unix timestamp. " +
            "This transaction has no timelock (nLockTime = 0).</p>";
        }

        if (hasHighFee) {
          html += "<p><strong>\uD83D\uDEA8 High-fee warning:</strong> " +
            "The fee on this transaction is unusually large. Verify the fee rate and amounts before signing.</p>";
        }

        explainEl.innerHTML = html;

        report.selected_inputs.forEach((input) => {
          inputsEl.appendChild(li(input.value_sats + ' sats | ' + input.txid + ':' + input.vout));
        });

        report.outputs.forEach((output) => {
          const prefix = output.is_change ? '[CHANGE] ' : '[PAYMENT] ';
          const label = prefix + output.value_sats + ' sats | ' + output.script_type;
          outputsEl.appendChild(li(label));
        });
      } catch (error) {
        statusEl.textContent = 'Error: ' + error.message;
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
