#!/usr/bin/env node
import { readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const requiredFiles = [
  'AGENTS.md',
  'src/orders/AGENTS.md',
  'docs/architecture/overview.md',
  'docs/architecture/orders.md',
  'docs/decisions/0001-order-dependency-boundaries.md',
  '.cursor/rules/test-conventions.mdc',
  '.claude/rules/test-conventions.md',
  'examples/skills/add-order-use-case/SKILL.md',
  'scripts/skill-installer.mjs',
  'tests/skill-installer.test.mjs',
  'package-lock.json',
  '.github/workflows/ci.yml',
];

const failures = [];
for (const claudeFile of ['CLAUDE.md', 'CLAUDE.local.md']) {
  try {
    await access(path.join(root, claudeFile));
    failures.push(`${claudeFile} changes Claude Code's default AGENTS.md discovery mode; import @AGENTS.md or configure Claude to read both.`);
  } catch {
    // This reference project intentionally relies on Claude Code's default AGENTS.md mode.
  }
}
for (const relativePath of requiredFiles) {
  try {
    await access(path.join(root, relativePath));
  } catch {
    failures.push(`Missing required context file: ${relativePath}`);
  }
}

if (failures.length === 0) {
  const skillPath = 'examples/skills/add-order-use-case/SKILL.md';
  const skill = await readFile(path.join(root, skillPath), 'utf8');
  const frontmatter = skill.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatter) {
    failures.push('The canonical SKILL.md is missing YAML frontmatter.');
  } else {
    const name = frontmatter[1].match(/^name:\s*([a-z0-9-]+)\s*$/m)?.[1];
    const description = frontmatter[1].match(/^description:\s*["']?(.+?)["']?\s*$/m)?.[1];
    if (name !== 'add-order-use-case') failures.push('SKILL.md name must match the skill directory.');
    if (!description || description.length > 1024) failures.push('SKILL.md needs a non-empty description of at most 1024 characters.');
  }
  if (!skill.includes('docs/architecture/orders.md')) {
    failures.push('The Skill must direct the agent to docs/architecture/orders.md.');
  }

  const cursorRule = await readFile(path.join(root, '.cursor/rules/test-conventions.mdc'), 'utf8');
  if (!/^---\r?\n[\s\S]*?globs:\s*tests\/\*\*\/\*\.test\.mjs/m.test(cursorRule)) {
    failures.push('Cursor rule must have a test-file glob in its frontmatter.');
  }

  const claudeRule = await readFile(path.join(root, '.claude/rules/test-conventions.md'), 'utf8');
  if (!/^---\r?\n[\s\S]*?paths:\s*\r?\n\s*-\s*["']?tests\/\*\*\/\*\.test\.mjs/m.test(claudeRule)) {
    failures.push('Claude rule must have a test-file path scope in its frontmatter.');
  }
}

if (failures.length > 0) {
  console.error('Agent context check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Agent context check passed.');
}
