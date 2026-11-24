import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { installSkill } from '../scripts/skill-installer.mjs';

async function createFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'architecture-context-skill-'));
  const source = path.join(root, 'examples/skills/add-order-use-case');
  await mkdir(source, { recursive: true });
  await writeFile(path.join(source, 'SKILL.md'), [
    '---',
    'name: add-order-use-case',
    'description: Add an order use case while following the sample architecture.',
    '---',
    '',
    '# Skill',
    '',
  ].join('\n'));
  return root;
}

test('installs the canonical Skill without deleting files in other discovery locations', async () => {
  const root = await createFixture();
  try {
    const unrelated = path.join(root, '.cursor/skills/add-order-use-case');
    await mkdir(unrelated, { recursive: true });
    await writeFile(path.join(unrelated, 'custom.md'), 'Keep this file.');

    const result = await installSkill({ rootDirectory: root, target: 'codex' });
    assert.equal(result.installed, true);
    assert.equal(result.destination, '.agents/skills/add-order-use-case');
    assert.equal(result.warnings.length, 1);
    assert.equal(await readFile(path.join(unrelated, 'custom.md'), 'utf8'), 'Keep this file.');
    assert.match(await readFile(path.join(root, result.destination, 'SKILL.md'), 'utf8'), /# Skill/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('a second identical install is a no-op', async () => {
  const root = await createFixture();
  try {
    const first = await installSkill({ rootDirectory: root, target: 'cursor' });
    const second = await installSkill({ rootDirectory: root, target: 'codex' });
    assert.equal(first.installed, true);
    assert.equal(second.installed, false);
    assert.match(second.message, /already installed/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('does not overwrite a modified destination without explicit force', async () => {
  const root = await createFixture();
  try {
    const destination = path.join(root, '.agents/skills/add-order-use-case');
    await mkdir(destination, { recursive: true });
    await writeFile(path.join(destination, 'SKILL.md'), 'User-edited version.');

    await assert.rejects(
      () => installSkill({ rootDirectory: root, target: 'codex' }),
      /was left unchanged.*use --force/,
    );
    assert.equal(await readFile(path.join(destination, 'SKILL.md'), 'utf8'), 'User-edited version.');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('force replaces only the selected destination and keeps a backup', async () => {
  const root = await createFixture();
  try {
    const destination = path.join(root, '.agents/skills/add-order-use-case');
    await mkdir(destination, { recursive: true });
    await writeFile(path.join(destination, 'SKILL.md'), 'User-edited version.');
    const unrelated = path.join(root, '.claude/skills/add-order-use-case');
    await mkdir(unrelated, { recursive: true });
    await writeFile(path.join(unrelated, 'custom.md'), 'Do not delete.');

    const result = await installSkill({ rootDirectory: root, target: 'codex', force: true });
    assert.equal(result.installed, true);
    assert.ok(result.backup);
    assert.match(await readFile(path.join(destination, 'SKILL.md'), 'utf8'), /# Skill/);
    assert.equal(await readFile(path.join(root, result.backup, 'SKILL.md'), 'utf8'), 'User-edited version.');
    assert.equal(await readFile(path.join(unrelated, 'custom.md'), 'utf8'), 'Do not delete.');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('refuses a symbolic-link destination parent', async () => {
  const root = await createFixture();
  const outside = await mkdtemp(path.join(os.tmpdir(), 'architecture-context-outside-'));
  try {
    await symlink(outside, path.join(root, '.agents'));
    await assert.rejects(
      () => installSkill({ rootDirectory: root, target: 'codex' }),
      /symbolic link/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});

test('rejects an unsupported client target', async () => {
  const root = await createFixture();
  try {
    await assert.rejects(
      () => installSkill({ rootDirectory: root, target: 'unknown' }),
      /codex, cursor, claude/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});


test('refuses a symbolic-link canonical source directory', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'architecture-context-source-link-'));
  const outside = await mkdtemp(path.join(os.tmpdir(), 'architecture-context-outside-source-'));
  try {
    await mkdir(path.join(root, 'examples/skills'), { recursive: true });
    await mkdir(path.join(outside, 'add-order-use-case'), { recursive: true });
    await writeFile(path.join(outside, 'add-order-use-case/SKILL.md'), [
      '---',
      'name: add-order-use-case',
      'description: External Skill content.',
      '---',
      '# External',
    ].join('\n'));
    await symlink(path.join(outside, 'add-order-use-case'), path.join(root, 'examples/skills/add-order-use-case'));

    await assert.rejects(
      () => installSkill({ rootDirectory: root, target: 'codex' }),
      /symbolic link/,
    );
    assert.equal(await readFile(path.join(outside, 'add-order-use-case/SKILL.md'), 'utf8').then(text => text.includes('# External')), true);
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});
