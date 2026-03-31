# Coin Smith

Coin Smith is a Bitcoin transaction construction toolkit focused on safe, explainable PSBT creation.

It accepts a fixture-like wallet state (UTXOs, requested payments, change template, policy constraints), performs deterministic coin selection, computes fees and change, builds a BIP-174 PSBT, and returns a machine-readable report for automation and a human-readable web view for education.

## Why this project exists

Bitcoin wallets are safety-critical software. The difficult part is usually not serializing transactions, it is making the right wallet decisions under constraints:

- selecting the right inputs without overspending fees,
- enforcing dust and policy boundaries,
- handling RBF and locktime correctly,
- exposing enough context for review before signing.

Coin Smith is designed to be a small, auditable codebase that demonstrates those wallet fundamentals clearly.

## Features

- Deterministic greedy coin selection.
- Fee-aware change handling with dust protection.
- PSBT export with prevout metadata via bitcoinjs-lib.
- RBF and locktime handling aligned with practical wallet behavior.
- Structured error model for CLI and HTTP API.
- Built-in web UI that explains selections, outputs, warnings, and PSBT payload.
- Test suite covering fee math, locktime/sequence behavior, warnings, and policy enforcement.

## Project status

This repository is actively suitable for learning, experimentation, and small integrations.

It is not production wallet software and should not be used with private keys or mainnet funds in real custody workflows.

## Table of contents

- [Quick start](#quick-start)
- [CLI usage](#cli-usage)
- [Web app and API](#web-app-and-api)
- [Input schema](#input-schema)
- [Output report schema](#output-report-schema)
- [Design rules](#design-rules)
- [Architecture](#architecture)
- [Development](#development)
- [Testing](#testing)
- [Contributing](#contributing)
- [Security and responsible use](#security-and-responsible-use)
- [Roadmap](#roadmap)

## Quick start

### Prerequisites

- Node.js 20+
- npm

### Install dependencies

```bash
npm install
```

### Run a fixture from CLI

```bash
./cli.sh fixtures/basic_change_p2wpkh.json
```

Output is written to:

```text
out/basic_change_p2wpkh.json
```

### Start web UI

```bash
./web.sh
```

Default URL:

```text
http://127.0.0.1:3000
```

## CLI usage

Command:

```bash
./cli.sh <fixture.json>
```

Behavior:

- Reads fixture JSON from the provided path.
- Writes one JSON file to out/<fixture_name>.json.
- Returns exit code 0 on success.
- Returns exit code 1 on error and writes an error JSON payload.

Error payload shape:

```json
{
  "ok": false,
  "error": {
    "code": "INVALID_FIXTURE",
    "message": "..."
  }
}
```

## Web app and API

Start command:

```bash
./web.sh
```

The web server exposes:

- GET /: HTML UI for fixture upload and transaction report visualization.
- GET /api/health: Health probe.
- POST /api/build: Build endpoint. Accepts fixture JSON and returns the same report shape as CLI success output.

Example API call:

```bash
curl -X POST http://127.0.0.1:3000/api/build \
  -H "content-type: application/json" \
  -d @fixtures/basic_change_p2wpkh.json
```

## Input schema

Minimal fixture example:

```json
{
  "network": "mainnet",
  "utxos": [
    {
      "txid": "11...",
      "vout": 0,
      "value_sats": 100000,
      "script_pubkey_hex": "0014...",
      "script_type": "p2wpkh",
      "address": "bc1..."
    }
  ],
  "payments": [
    {
      "address": "bc1...",
      "script_pubkey_hex": "0014...",
      "script_type": "p2wpkh",
      "value_sats": 70000
    }
  ],
  "change": {
    "address": "bc1...",
    "script_pubkey_hex": "0014...",
    "script_type": "p2wpkh"
  },
  "fee_rate_sat_vb": 5,
  "rbf": true,
  "locktime": 850000,
  "current_height": 850000,
  "policy": {
    "max_inputs": 5
  }
}
```

Notes:

- script_pubkey_hex is authoritative for transaction construction.
- address fields are informational and used for reporting/UI readability.
- rbf, locktime, current_height, and policy.max_inputs are optional.
- Additional fields are ignored by the builder.

## Output report schema

Success payload summary:

- ok: true
- network
- strategy
- selected_inputs
- payment_outputs
- change_output
- outputs
- change_index
- fee_sats
- fee_rate_sat_vb
- effective_fee_rate
- vbytes
- warnings
- rbf_enabled
- rbf_signaling
- locktime
- locktime_type
- psbt_base64

Example snippet:

```json
{
  "ok": true,
  "strategy": "greedy",
  "fee_sats": 700,
  "fee_rate_sat_vb": 5,
  "vbytes": 140,
  "rbf_signaling": true,
  "locktime": 850000,
  "locktime_type": "block_height",
  "warnings": [{ "code": "RBF_SIGNALING" }],
  "psbt_base64": "cHNidP8BA..."
}
```

## Design rules

Coin Smith enforces these wallet invariants:

- Balance equation: sum(inputs) = sum(outputs) + fee.
- Fee floor: fee uses ceil(vbytes * fee_rate_sat_vb).
- Dust rule: change below 546 sats is not created.
- Single change output max.
- No ambiguous script types: unsupported script types fail fast.
- Consistent sequence/locktime behavior:
- rbf=true uses sequence 0xFFFFFFFD.
- rbf=false with non-zero locktime uses sequence 0xFFFFFFFE.
- otherwise sequence is final 0xFFFFFFFF.

Warnings currently emitted:

- HIGH_FEE
- DUST_CHANGE
- SEND_ALL
- RBF_SIGNALING

## Architecture

Core modules in builder/:

- validate.js: Fixture validation and normalization.
- fees.js: vbytes estimation and fee calculation.
- locktime.js: nSequence and nLockTime logic.
- build.js: Coin selection, fee/change solving, report assembly.
- psbt.js: PSBT assembly via bitcoinjs-lib.
- cli.js: Command-line entrypoint and output writing.
- web.js: HTTP server and interactive UI.

Supporting files:

- fixtures/: Public fixtures for behavior coverage.
- builder/*.test.js: Unit and integration-style tests.

## Development

Useful commands:

```bash
npm test
npm run build-cli -- fixtures/basic_change_p2wpkh.json
npm run start-web
```

Shell wrappers (recommended for challenge-compatible flows):

```bash
./cli.sh fixtures/basic_change_p2wpkh.json
./web.sh
```

## Testing

Run all tests:

```bash
npm test
```

The suite verifies:

- Report structure and PSBT presence.
- Fee equation consistency.
- Locktime classification and sequence selection.
- RBF warning behavior.
- Send-all and max_inputs policy cases.

## Contributing

Contributions that improve correctness, clarity, and wallet safety are welcome.

Please follow this process:

1. Open an issue describing the bug, edge case, or feature.
2. Propose behavior before implementation for consensus-sensitive changes.
3. Keep pull requests focused and small.
4. Add or update tests for every behavioral change.
5. Include fixture examples for new edge cases when possible.

Preferred contribution areas:

- Better coin selection heuristics.
- More script type support and accurate weight modeling.
- Additional safety checks and warnings.
- Better explanation UX in the web interface.
- Performance profiling for large UTXO sets.

## Security and responsible use

- Do not add private key handling to this repository unless accompanied by a full threat model and external review.
- Treat all fixture input as untrusted.
- Never broadcast generated transactions without independent verification.
- Validate fee and change behavior on signet/testnet before any real usage.

If you find a security issue, open a private advisory if possible and avoid posting exploit details publicly until maintainers respond.

## Roadmap

- Add branch-and-bound style selection as an alternative strategy.
- Add deterministic tie-break telemetry in reports.
- Add optional descriptor-aware output annotations.
- Add API schema docs and typed client examples.
- Add CI checks for linting, formatting, and fixture regression snapshots.

## Acknowledgments

- bitcoinjs-lib maintainers and contributors.
- BIP-174 (PSBT) and BIP-125 (RBF) authors.
- Summer of Bitcoin for designing practical wallet engineering challenges.
