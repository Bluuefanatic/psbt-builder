import { INPUT_VBYTES, OUTPUT_VBYTES } from './constants.js';

function varIntLength(value) {
    if (value < 0xfd) return 1;
    if (value <= 0xffff) return 3;
    if (value <= 0xffffffff) return 5;
    return 9;
}

export function estimateVbytes(inputs, outputs) {
    const hasWitness = inputs.some((input) => input.script_type !== 'p2pkh');

    const baseWeight = (4 + 4 + varIntLength(inputs.length) + varIntLength(outputs.length)) * 4;
    const markerFlagWeight = hasWitness ? 2 : 0;

    const inWeight = inputs.reduce((sum, input) => sum + Math.ceil(INPUT_VBYTES[input.script_type] * 4), 0);
    const outWeight = outputs.reduce((sum, output) => sum + Math.ceil(OUTPUT_VBYTES[output.script_type] * 4), 0);

    return Math.ceil((baseWeight + markerFlagWeight + inWeight + outWeight) / 4);
}

export function feeFromRate(vbytes, feeRateSatVb) {
    return Math.ceil(vbytes * feeRateSatVb);
}
