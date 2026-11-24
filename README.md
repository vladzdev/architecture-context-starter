# Architecture Context Starter

A small, runnable reference project showing how to give Claude Code, Cursor, and Codex useful architecture context without maintaining three unrelated instruction systems.

This is an educational example, not a framework or a universal architecture prescription. It contains a deliberately small order-processing module so the documentation, instructions, Skills, and checks have real code to refer to.

## What this demonstrates

- A concise root `AGENTS.md` shared by Codex, Cursor, and compatible Claude Code versions.
- A nested `src/orders/AGENTS.md` for instructions that only apply inside one module.
- Native path-scoped rules for Claude Code and Cursor, used for test conventions rather than duplicating the shared architecture rules.
- One canonical Agent Skill, with a non-destructive installer for the selected tool's discovery directory.
- Architecture documentation and an ADR that explain the decisions behind the code.
- Runnable behavior tests and a small static dependency-boundary check.
- A GitHub Actions workflow that runs the checks on Node.js 22 and 24.

## Requirements

- Node.js 22 or later
- npm (bundled with Node.js)

There are no runtime or development dependencies.

## Run the checks

From the repository root:

```bash
npm ci
npm run check
```

The command runs:

1. Node's built-in test runner (`node --test`).
2. The architecture dependency check.
3. Checks that the agent-context files are present and that Skill metadata, paths, and referenced documentation are valid.

You can also run the parts separately:

```bash
npm test
npm run check:architecture
npm run check:context
```

## Repository map

```text
.
├── AGENTS.md
├── src/
│   └── orders/
│       ├── AGENTS.md
│       ├── domain/
│       ├── application/
│       ├── infrastructure/
│       └── http/
├── docs/
│   ├── architecture/
│   └── decisions/
├── examples/
│   ├── skills/add-order-use-case/SKILL.md
│   └── verification-prompts.md
├── .claude/rules/test-conventions.md
├── .cursor/rules/test-conventions.mdc
├── scripts/
├── tests/
└── .github/workflows/ci.yml
```

## How each agent finds the context

| Tool | Shared instructions | Module instructions | Scoped rule | Skill location |
|---|---|---|---|---|
| Codex | `AGENTS.md` | `src/orders/AGENTS.md` | Nested `AGENTS.md` is the scoped mechanism | `.agents/skills/` |
| Cursor | `AGENTS.md` | `src/orders/AGENTS.md` | `.cursor/rules/*.mdc` | `.agents/skills/` (also supports `.cursor/skills/`) |
| Claude Code | `AGENTS.md` on supported versions when Project instructions is set to read `AGENTS.md` | `src/orders/AGENTS.md` in the same mode | `.claude/rules/*.md` | `.claude/skills/` |

### Claude Code note

This repository intentionally does **not** include a root `CLAUDE.md`. On supported Claude Code versions (2.1.277+), the default Project instructions mode reads `AGENTS.md` when there is no `CLAUDE.md` or `CLAUDE.local.md` in the working directory or its ancestors.

If your own project already has a `CLAUDE.md`, either import the shared instructions with `@AGENTS.md` or configure Project instructions to read both files (`claude-md-and-agents-md`). Check `/config` in your installed version rather than assuming the mode.

## Install the Skill for one tool

The canonical Skill source lives at `examples/skills/add-order-use-case/`. Install it for the tool you are currently using:

```bash
npm run skill:install -- codex
npm run skill:install -- cursor
npm run skill:install -- claude
```

Codex and Cursor use `.agents/skills/` in this example; Claude Code uses `.claude/skills/`. The installer copies only the canonical Skill into the selected location. It never deletes or modifies copies in other discovery directories.

If the destination already contains a different Skill, installation stops without changing it. Review the existing files before deciding what to do. To explicitly replace only the selected destination, run:

```bash
npm run skill:install -- codex --force
```

`--force` preserves a backup under `.skill-install-backups/` before replacing the selected directory. It does not remove Skills installed for another tool. The installer also refuses symbolic-link paths, to avoid writing through a directory link into another location.

Cursor can discover Skills from more than one location, including `.agents/skills/`, `.cursor/skills/`, `.claude/skills/`, and `.codex/skills/`. If the same Skill exists in multiple locations, Cursor may discover multiple copies. The installer reports other copies but leaves them untouched; decide manually which copy should remain available to Cursor.

The generated Skill copies and backups are git-ignored. The canonical source remains in `examples/skills/`. If you want to share a generated copy with a team, review it, remove the corresponding ignore entry, and commit only the location your team intends to use.

## The example architecture

The sample order module has four layers:

- `domain`: validates and creates an order; it has no dependencies on other application layers.
- `application`: coordinates the use case and depends on the domain.
- `infrastructure`: provides an in-memory repository adapter.
- `http`: translates an HTTP request into an application use case call.

The direction rules are documented in `docs/architecture/orders.md` and repeated in the nested module instructions. They are not inferred from vague phrases like “use clean architecture.”

## What the architecture check does — and does not do

The checker validates local, static ESM imports within `src/orders/` against the layer rules. It rejects dynamic `import()`, CommonJS `require()`, Node built-ins, and external packages in that sample source tree because those forms are outside this intentionally small checker's policy.

It is a teaching-sized guardrail, not a general JavaScript parser, security scanner, or replacement for a production dependency-analysis tool. If you adapt the example to a larger project, use a parser or a dedicated architecture/lint tool that understands your language and module system.

## Try it with an agent

Open the repository in Claude Code, Cursor, or Codex and give it this task:

> Add a use case that cancels an existing order. Before editing, identify the relevant architecture documents and explain which layer should own the operation. Keep the domain independent of infrastructure and HTTP. Add tests, run `npm run check`, and report any assumptions.

Then inspect whether the agent:

1. Read the root and module instructions.
2. Used the architecture documents rather than inventing a new pattern.
3. Kept dependencies pointing in the documented direction.
4. Added behavior tests and passed the architecture check.

A useful second test is to ask the agent to add persistence directly to the domain layer. It should recognize the conflict with the documented boundary and ask to change the architecture decision rather than silently violating it.

More test prompts are in [`examples/verification-prompts.md`](examples/verification-prompts.md).

## What this project does not implement

This repository demonstrates project instructions, architecture documentation, one Skill, and local automated checks. It does not include an MCP server, configured subagents, or lifecycle Hooks. Those mechanisms have different setup and security considerations and are covered conceptually in the companion article.

## Adapting this to a real codebase

1. Replace the sample order model and directory map with your actual modules.
2. Write down only the architectural decisions that affect implementation choices.
3. Keep root instructions short; link to detailed docs instead of copying them into every file.
4. Add nested instructions only where a module has genuinely different constraints.
5. Create a Skill only for a workflow you repeat.
6. Keep the architecture check appropriate to the real language and repository size.

The repository is intentionally small so the relationship between the files is easy to inspect. Copy the ideas, not necessarily the directory names or the sample architecture.

## License

MIT. See [`LICENSE`](LICENSE).
