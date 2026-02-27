#!/usr/bin/env node
import path from 'node:path';
import { buildTransactionReport } from './build.js';
import { BuilderError } from './errors.js';
import { readFixtureFromFile, writeJsonFile, buildOutputPathFromFixture } from './io.js';

function errorPayload(code, message) {
  return { ok: false, error: { code, message } };
}

function main() {
  const fixturePath = process.argv[2];

  if (!fixturePath) {
    const outputPath = path.join('out', 'error.json');
    const payload = errorPayload('INVALID_ARGS', 'Usage: cli.sh <fixture.json>');
    writeJsonFile(outputPath, payload);
    console.error(payload.error.message);
    process.exit(1);
  }

  const outputPath = buildOutputPathFromFixture(fixturePath);

  try {
    const fixture = readFixtureFromFile(fixturePath);
    const result = buildTransactionReport(fixture);
    writeJsonFile(outputPath, result);
    process.exit(0);
  } catch (error) {
    const payload = error instanceof BuilderError
      ? errorPayload(error.code, error.message)
      : errorPayload('BUILD_FAILED', error instanceof Error ? error.message : 'Unknown error');

    writeJsonFile(outputPath, payload);
    console.error(payload.error.message);
    process.exit(1);
  }
}

main();
