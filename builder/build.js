import { DUST_THRESHOLD_SATS, WARNING_CODES } from './constants.js';
import { BuilderError } from './errors.js';
import { estimateVbytes, feeFromRate } from './fees.js';
import { buildPsbtBase64 } from './psbt.js';
import { computeFinalLocktime, classifyLocktime, computeSequence } from './locktime.js';
import { validateFixture } from './validate.js';

function sortUtxosDeterministically(utxos) {
  return [...utxos].sort((a, b) => {
    if (b.value_sats !== a.value_sats) return b.value_sats - a.value_sats;
    if (a.txid !== b.txid) return a.txid.localeCompare(b.txid);
    return a.vout - b.vout;
  });
}

function sumSats(items) {
  return items.reduce((sum, item) => sum + item.value_sats, 0);
}

function toWarningList(codes) {
  return [...codes].sort().map((code) => ({ code }));
}

function makeOutput(base, index, isChange) {
  return {
    n: index,
    value_sats: base.value_sats,
    script_pubkey_hex: base.script_pubkey_hex,
    script_type: base.script_type,
    address: base.address,
    is_change: isChange,
  };
}

function solveOutputsForSelection({ fixture, selectedInputs, paymentSum }) {
  const baseOutputs = fixture.payments.map((payment) => ({ ...payment }));
  const inputSum = sumSats(selectedInputs);

  const vbytesNoChange = estimateVbytes(selectedInputs, baseOutputs);
  const feeNoChange = feeFromRate(vbytesNoChange, fixture.fee_rate_sat_vb);
  const leftoverNoChange = inputSum - paymentSum - feeNoChange;

  if (leftoverNoChange < 0) {
    return { ok: false };
  }

  const warnings = new Set();
  let outputs = baseOutputs;
  let changeOutput = null;
  let vbytes = vbytesNoChange;
  let feeSats = feeNoChange;

  if (leftoverNoChange === 0) {
    warnings.add(WARNING_CODES.SEND_ALL);
  } else if (leftoverNoChange < DUST_THRESHOLD_SATS) {
    feeSats = inputSum - paymentSum;
    warnings.add(WARNING_CODES.SEND_ALL);
    warnings.add(WARNING_CODES.DUST_CHANGE);
  } else {
    const candidateOutputs = [...baseOutputs, { ...fixture.change, value_sats: 0 }];
    const vbytesWithChange = estimateVbytes(selectedInputs, candidateOutputs);
    const feeWithChange = feeFromRate(vbytesWithChange, fixture.fee_rate_sat_vb);
    const computedChange = inputSum - paymentSum - feeWithChange;

    if (computedChange >= DUST_THRESHOLD_SATS) {
      candidateOutputs[candidateOutputs.length - 1].value_sats = computedChange;
      outputs = candidateOutputs;
      changeOutput = candidateOutputs[candidateOutputs.length - 1];
      vbytes = vbytesWithChange;
      feeSats = feeWithChange;
    } else {
      feeSats = inputSum - paymentSum;
      warnings.add(WARNING_CODES.SEND_ALL);
      warnings.add(WARNING_CODES.DUST_CHANGE);
    }
  }

  if (changeOutput && changeOutput.value_sats < DUST_THRESHOLD_SATS) {
    warnings.add(WARNING_CODES.DUST_CHANGE);
  }

  if (feeSats > 1000000 || feeSats / vbytes > 200) {
    warnings.add(WARNING_CODES.HIGH_FEE);
  }

  return {
    ok: true,
    outputs,
    feeSats,
    vbytes,
    warnings,
    changeOutput,
  };
}

export function buildTransactionReport(rawFixture) {
  const fixture = validateFixture(rawFixture);
  const paymentSum = sumSats(fixture.payments);

  if (paymentSum <= 0) {
    throw new BuilderError('INVALID_FIXTURE', 'payments total must be greater than zero');
  }

  const sortedUtxos = sortUtxosDeterministically(fixture.utxos);

  let selectedInputs = [];
  let solved = null;

  for (const utxo of sortedUtxos) {
    if (selectedInputs.length >= fixture.policy.max_inputs) {
      break;
    }

    selectedInputs = [...selectedInputs, utxo];
    solved = solveOutputsForSelection({
      fixture,
      selectedInputs,
      paymentSum,
    });

    if (solved.ok) {
      break;
    }
  }

  if (!solved?.ok) {
    if (fixture.policy.max_inputs < sortedUtxos.length) {
      throw new BuilderError('MAX_INPUTS_EXCEEDED', 'policy.max_inputs prevents funding this transaction');
    }
    throw new BuilderError('INSUFFICIENT_FUNDS', 'Unable to fund payments and required fee');
  }

  const locktime = computeFinalLocktime(fixture);
  const sequence = computeSequence({ rbf: fixture.rbf, locktime });
  const rbfSignaling = sequence <= 0xfffffffd;
  if (rbfSignaling) {
    solved.warnings.add(WARNING_CODES.RBF_SIGNALING);
  }

  const outputsWithMeta = solved.outputs.map((output, index) =>
    makeOutput(output, index, index === solved.outputs.length - 1 && output.script_pubkey_hex === fixture.change.script_pubkey_hex && output.value_sats === solved.changeOutput?.value_sats),
  );

  const changeIndex = outputsWithMeta.findIndex((output) => output.is_change === true);
  const psbtBase64 = buildPsbtBase64({
    network: fixture.network,
    selectedInputs,
    outputs: outputsWithMeta,
    sequence,
    locktime,
  });

  const inputSum = sumSats(selectedInputs);
  const outputSum = outputsWithMeta.reduce((sum, output) => sum + output.value_sats, 0);
  if (inputSum !== outputSum + solved.feeSats) {
    throw new BuilderError('BALANCE_MISMATCH', 'sum(inputs) must equal sum(outputs) + fee');
  }

  const feeRate = solved.feeSats / solved.vbytes;

  return {
    ok: true,
    network: fixture.network,
    strategy: 'greedy',
    selected_inputs: selectedInputs,
    payment_outputs: outputsWithMeta.filter((output) => !output.is_change),
    change_output: changeIndex === -1 ? null : outputsWithMeta[changeIndex],
    outputs: outputsWithMeta,
    change_index: changeIndex === -1 ? null : changeIndex,
    fee_sats: solved.feeSats,
    fee_rate_sat_vb: Number(feeRate.toFixed(8)),
    effective_fee_rate: Number(feeRate.toFixed(8)),
    vbytes: solved.vbytes,
    warnings: toWarningList(solved.warnings),
    rbf_enabled: rbfSignaling,
    rbf_signaling: rbfSignaling,
    locktime,
    locktime_type: classifyLocktime(locktime),
    psbt_base64: psbtBase64,
  };
}
