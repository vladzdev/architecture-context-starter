import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { checkArchitecture } from '../scripts/architecture-checker.mjs';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('the checked-in order module follows its documented dependency rules', async () => {
  assert.deepEqual(await checkArchitecture(repositoryRoot), []);
});

test('architecture checker reports an inward-layer dependency violation', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'architecture-context-'));
  try {
    const domain = path.join(root, 'src/orders/domain');
    const infrastructure = path.join(root, 'src/orders/infrastructure');
    await mkdir(domain, { recursive: true });
    await mkdir(infrastructure, { recursive: true });
    await writeFile(path.join(infrastructure, 'repository.mjs'), 'export const repository = {};\n');
    await writeFile(path.join(domain, 'order.mjs'), "import { repository } from '../infrastructure/repository.mjs';\nexport { repository };\n");

    const violations = await checkArchitecture(root);
    assert.equal(violations.length, 1);
    assert.match(violations[0], /domain must not depend on infrastructure/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('architecture checker rejects dynamic imports it cannot analyze', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'architecture-context-'));
  try {
    const domain = path.join(root, 'src/orders/domain');
    await mkdir(domain, { recursive: true });
    await writeFile(path.join(domain, 'order.mjs'), "export async function load() { return import('./other.mjs'); }\n");
    await writeFile(path.join(domain, 'other.mjs'), 'export const value = 1;\n');

    const violations = await checkArchitecture(root);
    assert.ok(violations.some(violation => /dynamic import\(\) is not supported/.test(violation)));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('architecture checker rejects external runtime dependencies in the example source tree', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'architecture-context-'));
  try {
    const domain = path.join(root, 'src/orders/domain');
    await mkdir(domain, { recursive: true });
    await writeFile(path.join(domain, 'order.mjs'), "import { randomUUID } from 'node:crypto';\nexport const id = randomUUID;\n");

    const violations = await checkArchitecture(root);
    assert.ok(violations.some(violation => /Node built-in/.test(violation)));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
