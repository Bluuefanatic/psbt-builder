import { DEFAULT_POLICY_MAX_INPUTS, INPUT_VBYTES, OUTPUT_VBYTES } from './constants.js';
import { BuilderError } from './errors.js';

function isObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function ensureNonEmptyString(value, code, field) {
    if (typeof value !== 'string' || value.length === 0) {
        throw new BuilderError(code, `${field} must be a non-empty string`);
    }
}

function ensureInteger(value, code, field, min = 0) {
    if (!Number.isInteger(value) || value < min) {
        throw new BuilderError(code, `${field} must be an integer >= ${min}`);
    }
}

export function validateFixture(rawFixture) {
    if (!isObject(rawFixture)) {
        throw new BuilderError('INVALID_FIXTURE', 'Fixture must be a JSON object');
    }

    const fixture = structuredClone(rawFixture);
    ensureNonEmptyString(fixture.network, 'INVALID_FIXTURE', 'network');

    if (!Array.isArray(fixture.utxos) || fixture.utxos.length === 0) {
        throw new BuilderError('INVALID_FIXTURE', 'utxos must be a non-empty array');
    }

    if (!Array.isArray(fixture.payments) || fixture.payments.length === 0) {
        throw new BuilderError('INVALID_FIXTURE', 'payments must be a non-empty array');
    }

    if (!isObject(fixture.change)) {
        throw new BuilderError('INVALID_FIXTURE', 'change must be an object');
    }

    if (typeof fixture.fee_rate_sat_vb !== 'number' || !isFinite(fixture.fee_rate_sat_vb) || fixture.fee_rate_sat_vb < 0) {
        throw new BuilderError('INVALID_FIXTURE', 'fee_rate_sat_vb must be a non-negative number');
    }

    if (fixture.rbf !== undefined && typeof fixture.rbf !== 'boolean') {
        throw new BuilderError('INVALID_FIXTURE', 'rbf must be a boolean when provided');
    }

    if (fixture.locktime !== undefined) {
        ensureInteger(fixture.locktime, 'INVALID_FIXTURE', 'locktime', 0);
    }

    if (fixture.current_height !== undefined) {
        ensureInteger(fixture.current_height, 'INVALID_FIXTURE', 'current_height', 0);
    }

    for (const [index, utxo] of fixture.utxos.entries()) {
        if (!isObject(utxo)) {
            throw new BuilderError('INVALID_FIXTURE', `utxos[${index}] must be an object`);
        }
        ensureNonEmptyString(utxo.txid, 'INVALID_FIXTURE', `utxos[${index}].txid`);
        ensureInteger(utxo.vout, 'INVALID_FIXTURE', `utxos[${index}].vout`, 0);
        ensureInteger(utxo.value_sats, 'INVALID_FIXTURE', `utxos[${index}].value_sats`, 0);
        ensureNonEmptyString(utxo.script_pubkey_hex, 'INVALID_FIXTURE', `utxos[${index}].script_pubkey_hex`);
        ensureNonEmptyString(utxo.script_type, 'INVALID_FIXTURE', `utxos[${index}].script_type`);
        if (!INPUT_VBYTES[utxo.script_type]) {
            throw new BuilderError('UNSUPPORTED_SCRIPT_TYPE', `Unsupported input script_type: ${utxo.script_type}`);
        }
    }

    for (const [index, payment] of fixture.payments.entries()) {
        if (!isObject(payment)) {
            throw new BuilderError('INVALID_FIXTURE', `payments[${index}] must be an object`);
        }
        ensureInteger(payment.value_sats, 'INVALID_FIXTURE', `payments[${index}].value_sats`, 0);
        ensureNonEmptyString(payment.script_pubkey_hex, 'INVALID_FIXTURE', `payments[${index}].script_pubkey_hex`);
        ensureNonEmptyString(payment.script_type, 'INVALID_FIXTURE', `payments[${index}].script_type`);
        if (!OUTPUT_VBYTES[payment.script_type]) {
            throw new BuilderError('UNSUPPORTED_SCRIPT_TYPE', `Unsupported payment script_type: ${payment.script_type}`);
        }
    }

    ensureNonEmptyString(fixture.change.script_pubkey_hex, 'INVALID_FIXTURE', 'change.script_pubkey_hex');
    ensureNonEmptyString(fixture.change.script_type, 'INVALID_FIXTURE', 'change.script_type');
    if (!OUTPUT_VBYTES[fixture.change.script_type]) {
        throw new BuilderError('UNSUPPORTED_SCRIPT_TYPE', `Unsupported change script_type: ${fixture.change.script_type}`);
    }

    const policyMaxInputs = fixture.policy?.max_inputs;
    if (policyMaxInputs !== undefined) {
        ensureInteger(policyMaxInputs, 'INVALID_FIXTURE', 'policy.max_inputs', 1);
    }

    return {
        ...fixture,
        rbf: fixture.rbf === true,
        policy: {
            ...(fixture.policy ?? {}),
            max_inputs: policyMaxInputs ?? DEFAULT_POLICY_MAX_INPUTS,
        },
    };
}
