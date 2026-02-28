export const DUST_THRESHOLD_SATS = 546;

export const DEFAULT_POLICY_MAX_INPUTS = Number.MAX_SAFE_INTEGER;

export const INPUT_VBYTES = {
    p2pkh: 148,
    p2sh: 92,
    'p2sh-p2wpkh': 91,
    p2wpkh: 68,
    p2wsh: 105,
    p2tr: 58,
};

export const OUTPUT_VBYTES = {
    p2pkh: 34,
    p2sh: 32,
    'p2sh-p2wpkh': 32,
    p2wpkh: 31,
    p2wsh: 43,
    p2tr: 43,
};

export const WARNING_CODES = {
    HIGH_FEE: 'HIGH_FEE',
    DUST_CHANGE: 'DUST_CHANGE',
    SEND_ALL: 'SEND_ALL',
    RBF_SIGNALING: 'RBF_SIGNALING',
};
