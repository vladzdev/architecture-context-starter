---
name: add-order-use-case
description: Add or change an order workflow in this example while respecting its documented domain, application, infrastructure, and HTTP boundaries. Use when implementing a new order operation or changing order behavior.
---

# Add an order use case

1. Read `docs/architecture/orders.md` and `docs/decisions/0001-order-dependency-boundaries.md`.
2. Inspect the existing order code and tests before creating new files.
3. Put business invariants in `src/orders/domain/`.
4. Put workflow coordination in `src/orders/application/`; inject repository and clock dependencies instead of importing concrete adapters.
5. Keep persistence adapters in `src/orders/infrastructure/` and request/response translation in `src/orders/http/`.
6. Add behavior tests using the built-in `node:test` runner.
7. Run `npm run check` and report the exact commands and results.
8. If the requested change conflicts with a documented boundary, explain the conflict before changing the architecture.
