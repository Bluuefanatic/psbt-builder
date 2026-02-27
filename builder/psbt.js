import bitcoin from 'bitcoinjs-lib';

const NETWORKS = {
    mainnet: bitcoin.networks.bitcoin,
    testnet: bitcoin.networks.testnet,
    regtest: bitcoin.networks.regtest,
};

export function buildPsbtBase64({ network, selectedInputs, outputs, sequence, locktime }) {
    const psbt = new bitcoin.Psbt({ network: NETWORKS[network] ?? bitcoin.networks.bitcoin });

    for (const input of selectedInputs) {
        psbt.addInput({
            hash: input.txid,
            index: input.vout,
            sequence,
            witnessUtxo: {
                script: Buffer.from(input.script_pubkey_hex, 'hex'),
                value: input.value_sats,
            },
        });
    }

    for (const output of outputs) {
        psbt.addOutput({
            script: Buffer.from(output.script_pubkey_hex, 'hex'),
            value: output.value_sats,
        });
    }

    psbt.setLocktime(locktime);
    return psbt.toBase64();
}
