import fs from 'node:fs';
import path from 'node:path';

export function readFixtureFromFile(fixturePath) {
    const raw = fs.readFileSync(fixturePath, 'utf8');
    return JSON.parse(raw);
}

export function writeJsonFile(filePath, payload) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

export function buildOutputPathFromFixture(fixturePath) {
    const name = path.basename(fixturePath);
    return path.join('out', name);
}
