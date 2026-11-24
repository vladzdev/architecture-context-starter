---
paths:
  - "tests/**/*.test.mjs"
---

# Test conventions

- Use Node.js built-in `node:test` and `node:assert/strict`; do not add a test framework for this example.
- Test externally observable behavior and error cases.
- Keep tests deterministic by injecting identifiers and clocks.
- When changing architecture, keep or add a test for the dependency rule as well as behavior tests.
- Run `npm run check` before reporting completion.
