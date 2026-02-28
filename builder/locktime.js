export function computeFinalLocktime(fixture) {
    if (fixture.locktime !== undefined) {
        return fixture.locktime;
    }

    if (fixture.rbf && fixture.current_height !== undefined) {
        return fixture.current_height;
    }

    return 0;
}

export function classifyLocktime(locktime) {
    if (locktime === 0) return 'none';
    if (locktime < 500000000) return 'block_height';
    return 'unix_timestamp';
}

export function computeSequence({ rbf, locktime }) {//
    if (rbf) return 0xfffffffd;
    if (locktime > 0) return 0xfffffffe;
    return 0xffffffff;
}
