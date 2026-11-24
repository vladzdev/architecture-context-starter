#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { installSkill } from './skill-installer.mjs';

const [target, ...flags] = process.argv.slice(2);
const unknownFlags = flags.filter(flag => flag !== '--force');

if (!target || unknownFlags.length > 0 || flags.filter(flag => flag === '--force').length > 1) {
  console.error('Usage: npm run skill:install -- <codex|cursor|claude> [--force]');
  process.exitCode = 1;
} else {
  const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  try {
    const result = await installSkill({
      rootDirectory,
      target: target.toLowerCase(),
      force: flags.includes('--force'),
    });
    console.log(`${result.message} ${result.destination}.`);
    if (result.backup) console.log(`Previous files were preserved at ${result.backup}.`);
    for (const warning of result.warnings) console.warn(`Warning: ${warning}`);
    console.log('The installed copy is git-ignored. The canonical source remains in examples/skills/.');
  } catch (error) {
    console.error(`Skill installation failed: ${error.message}`);
    process.exitCode = 1;
  }
}
