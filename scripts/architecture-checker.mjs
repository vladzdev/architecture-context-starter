import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const LAYER_DEPENDENCIES = new Map([
  ['domain', new Set(['domain'])],
  ['application', new Set(['application', 'domain'])],
  ['infrastructure', new Set(['infrastructure', 'domain'])],
  ['http', new Set(['http', 'application'])],
]);

const STATIC_IMPORT_PATTERN = /\b(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/g;

async function listModuleFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listModuleFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.mjs')) {
      files.push(fullPath);
    }
  }

  return files.sort();
}

function getStaticImports(source) {
  const imports = [];
  for (const match of source.matchAll(STATIC_IMPORT_PATTERN)) {
    imports.push(match[1]);
  }
  return imports;
}

function isInside(parent, child) {
  const relative = path.relative(parent, child);
  return relative !== '' && !relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative);
}

/**
 * Check the deliberately narrow ESM dependency policy used by this example.
 * This is not a general-purpose JavaScript parser or dependency analyzer.
 */
export async function checkArchitecture(rootDirectory) {
  const sourceRoot = path.resolve(rootDirectory, 'src/orders');
  const sourceStats = await stat(sourceRoot).catch(() => null);
  if (!sourceStats?.isDirectory()) {
    throw new Error(`Expected source directory: ${sourceRoot}`);
  }

  const files = await listModuleFiles(sourceRoot);
  const violations = [];

  for (const file of files) {
    const source = await readFile(file, 'utf8');
    const relativeFile = path.relative(sourceRoot, file).split(path.sep).join('/');
    const sourceLayer = relativeFile.split('/')[0];

    if (!LAYER_DEPENDENCIES.has(sourceLayer)) {
      violations.push(`${relativeFile}: unknown source layer "${sourceLayer}".`);
      continue;
    }

    if (/\bimport\s*\(/.test(source)) {
      violations.push(`${relativeFile}: dynamic import() is not supported by this example's architecture check.`);
    }
    if (/\brequire\s*\(/.test(source)) {
      violations.push(`${relativeFile}: CommonJS require() is not supported by this example's architecture check.`);
    }

    for (const specifier of getStaticImports(source)) {
      if (!specifier.startsWith('.')) {
        violations.push(`${relativeFile}: external, Node built-in, or non-relative import "${specifier}" is not allowed by this example policy.`);
        continue;
      }

      const target = path.resolve(path.dirname(file), specifier);
      const targetWithExtension = path.extname(target) ? target : `${target}.mjs`;

      if (!isInside(sourceRoot, targetWithExtension)) {
        violations.push(`${relativeFile}: import "${specifier}" resolves outside src/orders/.`);
        continue;
      }

      const targetExists = await stat(targetWithExtension).then(result => result.isFile()).catch(() => false);
      if (!targetExists) {
        violations.push(`${relativeFile}: import "${specifier}" does not resolve to a file.`);
        continue;
      }

      const targetLayer = path.relative(sourceRoot, targetWithExtension).split(path.sep)[0];
      if (!LAYER_DEPENDENCIES.get(sourceLayer).has(targetLayer)) {
        violations.push(`${relativeFile}: ${sourceLayer} must not depend on ${targetLayer} (${specifier}).`);
      }
    }
  }

  return violations;
}
