import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTransactionReport } from './build.js';
import { classifyLocktime, computeSequence } from './locktime.js';
import { estimateVbytes, feeFromRate } from './fees.js';

const baseFixture = {
  network: 'mainnet',
  utxos: [
    {
      txid: '11'.repeat(32),
      vout: 0,
      value_sats: 100000,
      script_pubkey_hex: '0014' + '11'.repeat(20),
      script_type: 'p2wpkh',
      address: 'bc1qtestinput',
    },
  ],
  payments: [
    {
      address: 'bc1qtestpayment',
      script_pubkey_hex: '0014' + '22'.repeat(20),
      script_type: 'p2wpkh',
      value_sats: 70000,
    },
  ],
  change: {
    address: 'bc1qtestchange',
    script_pubkey_hex: '0014' + '33'.repeat(20),
    script_type: 'p2wpkh',
  },
  fee_rate_sat_vb: 5,
  policy: {
    max_inputs: 5,
  },
};

test('buildTransactionReport returns ok true', () => {
  const report = buildTransactionReport(baseFixture);
  assert.equal(report.ok, true);
});

test('report includes psbt base64', () => {
  const report = buildTransactionReport(baseFixture);
  assert.ok(report.psbt_base64.length > 10);
});

test('fee equation is balanced', () => {
  const report = buildTransactionReport(baseFixture);
  const inputSum = report.selected_inputs.reduce((sum, i) => sum + i.value_sats, 0);
  const outputSum = report.outputs.reduce((sum, o) => sum + o.value_sats, 0);
  assert.equal(inputSum, outputSum + report.fee_sats);
});

test('classifyLocktime none', () => {
  assert.equal(classifyLocktime(0), 'none');
});

test('classifyLocktime block_height', () => {
  assert.equal(classifyLocktime(499999999), 'block_height');
});

test('classifyLocktime unix_timestamp', () => {
  assert.equal(classifyLocktime(500000000), 'unix_timestamp');
});

test('computeSequence RBF true', () => {
  assert.equal(computeSequence({ rbf: true, locktime: 0 }), 0xfffffffd);
});

test('computeSequence locktime no RBF', () => {
  assert.equal(computeSequence({ rbf: false, locktime: 1 }), 0xfffffffe);
});

test('computeSequence final', () => {
  assert.equal(computeSequence({ rbf: false, locktime: 0 }), 0xffffffff);
});

test('estimateVbytes returns integer', () => {
  const vbytes = estimateVbytes(baseFixture.utxos, baseFixture.payments);
  assert.equal(Number.isInteger(vbytes), true);
});

test('feeFromRate uses ceil', () => {
  assert.equal(feeFromRate(101, 1.1), 112);
});

test('rbf true emits RBF_SIGNALING warning', () => {
  const fixture = { ...baseFixture, rbf: true };
  const report = buildTransactionReport(fixture);
  assert.equal(report.warnings.some((w) => w.code === 'RBF_SIGNALING'), true);
});

test('locktime explicit appears in report', () => {
  const fixture = { ...baseFixture, locktime: 850000 };
  const report = buildTransactionReport(fixture);
  assert.equal(report.locktime, 850000);
  assert.equal(report.locktime_type, 'block_height');
});

test('anti-fee-sniping locktime uses current_height', () => {
  const fixture = { ...baseFixture, rbf: true, current_height: 900000 };
  const report = buildTransactionReport(fixture);
  assert.equal(report.locktime, 900000);
});

test('send-all warning appears when no change output', () => {
  const fixture = {
    ...baseFixture,
    utxos: [{ ...baseFixture.utxos[0], value_sats: 70200 }],
    fee_rate_sat_vb: 1,
  };
  const report = buildTransactionReport(fixture);
  assert.equal(report.change_index, null);
  assert.equal(report.warnings.some((w) => w.code === 'SEND_ALL'), true);
});

test('respects max_inputs policy error', () => {
  const fixture = {
    ...baseFixture,
    utxos: [
      { ...baseFixture.utxos[0], txid: 'aa'.repeat(32), value_sats: 30000 },
      { ...baseFixture.utxos[0], txid: 'bb'.repeat(32), value_sats: 30000 },
    ],
    policy: { max_inputs: 1 },
    payments: [{ ...baseFixture.payments[0], value_sats: 50000 }],
  };

  assert.throws(() => buildTransactionReport(fixture));
});
