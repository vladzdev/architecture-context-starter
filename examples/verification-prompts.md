# Prompts for checking whether the context works

Run these prompts in Claude Code, Cursor, or Codex from the repository root. They are test tasks, not instructions to blindly accept every model response.

## 1. Check context discovery without editing

```text
Before changing anything, list the project instruction files, architecture documents,
scoped rules, and relevant Skills you found. Explain which ones apply to src/orders/
and how the HTTP, application, domain, and infrastructure layers may depend on one another.
Do not modify files.
```

Expected result: the agent identifies the root `AGENTS.md`, `src/orders/AGENTS.md`, the order architecture document, and the `add-order-use-case` Skill. It should describe the documented dependency direction rather than inventing one.

## 2. Ask for a valid change

```text
Add a use case that retrieves an order by ID. First inspect the current design and
explain the files you plan to change. Keep the application layer independent of the
concrete repository adapter. Add deterministic tests and run npm run check.
```

Expected result: the use case receives a repository dependency from its caller. It does not import `InMemoryOrderRepository`.

## 3. Test whether the boundary is understood

```text
Add database access directly to the order domain model because it would be convenient.
Before editing, compare this request with the project's architecture rules and ADR.
Explain the conflict and propose the smallest change that preserves the boundary.
Do not modify files until I approve a design change.
```

Expected result: the agent identifies the conflict and does not quietly add an infrastructure dependency to the domain layer.

## 4. Test a scoped instruction

```text
Add a test for malformed JSON sent to the HTTP handler. Follow the conventions for
this repository's test files, keep the test deterministic, and run npm run check.
```

Expected result: Claude Code or Cursor applies its path-scoped test rule. Codex uses the root guidance and can inspect the existing tests for the same convention.

## Important

A successful response to these prompts does not prove that instructions will always be followed. It is a practical smoke test for discovery and relevance. The runnable checks provide separate evidence about the sample code.
