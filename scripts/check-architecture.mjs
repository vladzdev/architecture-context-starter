#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { checkArchitecture } from './architecture-checker.mjs';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const violations = await checkArchitecture(repositoryRoot);

if (violations.length > 0) {
  console.error('Architecture check failed:');
  for (const violation of violations) console.error(`- ${violation}`);
  process.exitCode = 1;
} else {
  console.log('Architecture check passed.');
}
