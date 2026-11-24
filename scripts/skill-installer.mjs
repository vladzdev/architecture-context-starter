import {
  cp,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rename,
  rm,
} from 'node:fs/promises';
import path from 'node:path';

const SKILL_NAME = 'add-order-use-case';
const SOURCE_RELATIVE_PATH = `examples/skills/${SKILL_NAME}`;

export const SKILL_TARGETS = new Map([
  ['codex', `.agents/skills/${SKILL_NAME}`],
  ['cursor', `.agents/skills/${SKILL_NAME}`],
  ['claude', `.claude/skills/${SKILL_NAME}`],
]);

// Cursor can discover Skills from more than one of these locations. We report
// duplicates, but never delete a copy belonging to another tool or workflow.
export const SKILL_DISCOVERY_PATHS = [
  `.agents/skills/${SKILL_NAME}`,
  `.claude/skills/${SKILL_NAME}`,
  `.cursor/skills/${SKILL_NAME}`,
  `.codex/skills/${SKILL_NAME}`,
];

function isMissing(error) {
  return error && error.code === 'ENOENT';
}

async function inspectPathWithoutFollowingSymlinks(root, relativePath) {
  const segments = relativePath.split('/');
  let current = root;

  for (let index = 0; index < segments.length; index += 1) {
    current = path.join(current, segments[index]);
    let stats;

    try {
      stats = await lstat(current);
    } catch (error) {
      if (isMissing(error)) return null;
      throw error;
    }

    if (stats.isSymbolicLink()) {
      throw new Error(`Refusing to follow a symbolic link in Skill path: ${relativePath}`);
    }

    if (index < segments.length - 1 && !stats.isDirectory()) {
      throw new Error(`A parent of the Skill path is not a directory: ${current}`);
    }

    if (index === segments.length - 1) {
      return { absolutePath: current, stats };
    }
  }

  return null;
}

async function ensureSafeDirectory(root, relativePath) {
  let current = root;
  for (const segment of relativePath.split('/').filter(Boolean)) {
    current = path.join(current, segment);
    try {
      const stats = await lstat(current);
      if (stats.isSymbolicLink() || !stats.isDirectory()) {
        throw new Error(`Refusing to use a non-directory or symbolic-link path: ${current}`);
      }
    } catch (error) {
      if (!isMissing(error)) throw error;
      await mkdir(current);
    }

    const resolved = await realpath(current);
    const relative = path.relative(root, resolved);
    if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
      throw new Error(`Resolved directory escapes the repository: ${current}`);
    }
  }
  return current;
}

async function assertRegularTree(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) {
      throw new Error(`Skill source must not contain symbolic links: ${fullPath}`);
    }
    if (entry.isDirectory()) {
      await assertRegularTree(fullPath);
    } else if (!entry.isFile()) {
      throw new Error(`Skill source contains an unsupported file type: ${fullPath}`);
    }
  }
}

async function validateSkillSource(sourceDirectory) {
  const sourceRealPath = await realpath(sourceDirectory);
  const skillFile = path.join(sourceRealPath, 'SKILL.md');
  const content = await readFile(skillFile, 'utf8');
  const frontmatter = content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!frontmatter) {
    throw new Error('The canonical Skill is missing YAML frontmatter.');
  }

  const name = frontmatter[1].match(/^name:\s*([a-z0-9-]+)\s*$/m)?.[1];
  const description = frontmatter[1].match(/^description:\s*(.+?)\s*$/m)?.[1];
  if (name !== SKILL_NAME) {
    throw new Error(`Skill name must be "${SKILL_NAME}"; received ${name ?? 'none'}.`);
  }
  if (!description || description.length > 1024) {
    throw new Error('Skill description must be non-empty and no longer than 1024 characters.');
  }

  await assertRegularTree(sourceRealPath);
  return sourceRealPath;
}

async function treesMatch(leftDirectory, rightDirectory) {
  const leftEntries = (await readdir(leftDirectory, { withFileTypes: true }))
    .map(entry => ({ name: entry.name, directory: entry.isDirectory(), file: entry.isFile() }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const rightEntries = (await readdir(rightDirectory, { withFileTypes: true }))
    .map(entry => ({ name: entry.name, directory: entry.isDirectory(), file: entry.isFile() }))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (JSON.stringify(leftEntries) !== JSON.stringify(rightEntries)) return false;

  for (const entry of leftEntries) {
    const leftPath = path.join(leftDirectory, entry.name);
    const rightPath = path.join(rightDirectory, entry.name);
    if (entry.directory) {
      if (!await treesMatch(leftPath, rightPath)) return false;
    } else if (entry.file) {
      const [left, right] = await Promise.all([readFile(leftPath), readFile(rightPath)]);
      if (!left.equals(right)) return false;
    } else {
      return false;
    }
  }
  return true;
}

/**
 * Install the canonical Skill into one client discovery directory.
 * Existing copies for other clients are left untouched and reported to the caller.
 */
export async function installSkill({ rootDirectory, target, force = false }) {
  const relativeDestination = SKILL_TARGETS.get(target);
  if (!relativeDestination) {
    throw new Error('Target must be one of: codex, cursor, claude.');
  }
  if (typeof force !== 'boolean') {
    throw new TypeError('force must be a boolean.');
  }

  const root = await realpath(rootDirectory);
  const rootStats = await lstat(root);
  if (!rootStats.isDirectory()) throw new Error('Repository root must be a directory.');

  const sourceInfo = await inspectPathWithoutFollowingSymlinks(root, SOURCE_RELATIVE_PATH);
  if (!sourceInfo?.stats.isDirectory()) {
    throw new Error(`Canonical Skill source directory is missing: ${SOURCE_RELATIVE_PATH}`);
  }
  const source = await validateSkillSource(sourceInfo.absolutePath);
  const sourceRelative = path.relative(root, source);
  if (sourceRelative === '..' || sourceRelative.startsWith(`..${path.sep}`) || path.isAbsolute(sourceRelative)) {
    throw new Error('Canonical Skill source resolves outside the repository.');
  }

  const existingCopies = [];
  for (const relativePath of SKILL_DISCOVERY_PATHS) {
    const found = await inspectPathWithoutFollowingSymlinks(root, relativePath);
    if (!found) continue;
    if (!found.stats.isDirectory()) {
      throw new Error(`An existing Skill path is not a directory: ${relativePath}`);
    }
    existingCopies.push(relativePath);
  }

  const destination = await inspectPathWithoutFollowingSymlinks(root, relativeDestination);
  const otherCopies = existingCopies.filter(relativePath => relativePath !== relativeDestination);
  const warnings = otherCopies.length > 0
    ? [`A same-name Skill also exists at: ${otherCopies.join(', ')}. Some clients may discover more than one copy; no other location was changed.`]
    : [];

  if (destination) {
    if (!destination.stats.isDirectory()) {
      throw new Error(`The destination exists but is not a directory: ${relativeDestination}`);
    }
    if (!force) {
      if (await treesMatch(source, destination.absolutePath)) {
        return { installed: false, destination: relativeDestination, warnings, message: 'The same Skill version is already installed.' };
      }
      throw new Error(`The destination already contains files and was left unchanged: ${relativeDestination}. Review it, or use --force to replace only this directory (a backup will be kept).`);
    }
  }

  const parentRelative = path.posix.dirname(relativeDestination);
  const parent = await ensureSafeDirectory(root, parentRelative);
  const stagingParent = await mkdtemp(path.join(parent, '.skill-install-stage-'));
  const stagingDirectory = path.join(stagingParent, SKILL_NAME);
  let backupDirectory = null;
  let movedOriginal = false;

  try {
    await cp(source, stagingDirectory, { recursive: true, errorOnExist: true, force: false });

    if (destination && force) {
      const backupRoot = await ensureSafeDirectory(root, '.skill-install-backups');
      const backupSlot = await mkdtemp(path.join(backupRoot, `${SKILL_NAME}-`));
      backupDirectory = path.join(backupSlot, SKILL_NAME);
      await cp(destination.absolutePath, backupDirectory, { recursive: true, errorOnExist: true, force: false });
      await rename(destination.absolutePath, path.join(stagingParent, 'previous'));
      movedOriginal = true;
    }

    await rename(stagingDirectory, path.join(root, relativeDestination));

    return {
      installed: true,
      destination: relativeDestination,
      backup: backupDirectory ? path.relative(root, backupDirectory).split(path.sep).join('/') : null,
      warnings,
      message: `Installed the canonical Skill for ${target}.`,
    };
  } catch (error) {
    if (movedOriginal) {
      try {
        await rename(path.join(stagingParent, 'previous'), path.join(root, relativeDestination));
      } catch (restoreError) {
        error.message += ` The original directory could not be restored automatically; its backup is at ${backupDirectory}. Restore it manually. Original restore error: ${restoreError.message}`;
      }
    }
    throw error;
  } finally {
    await rm(stagingParent, { recursive: true, force: true });
  }
}
