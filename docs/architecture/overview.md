# Architecture overview

This repository is a deliberately small example of a layered order-processing module. The layers are a teaching choice, not a claim that every application should use this architecture.

```text
HTTP handler
    |
    v
Application use case -----> Domain model
    |
    v
Repository port
    ^
    |
Infrastructure adapter
```

The runtime wiring is done by the caller. The application use case receives a repository, an ID generator, and a clock; it does not instantiate infrastructure itself.

## Source map

| Directory | Responsibility | May depend on |
|---|---|---|
| `src/orders/domain/` | Order invariants and domain errors | Domain code only |
| `src/orders/application/` | Use cases and application-facing error translation | Application and domain code |
| `src/orders/infrastructure/` | Repository adapters | Infrastructure and domain code |
| `src/orders/http/` | HTTP request/response translation | HTTP and application code |

Tests may import any layer. Production source code must follow the dependency rules in [`orders.md`](orders.md).

## Where to find the rules

- `AGENTS.md`: repository-wide instructions and navigation.
- `src/orders/AGENTS.md`: instructions that apply only to the order module.
- `docs/architecture/orders.md`: the detailed explanation and examples.
- `docs/decisions/0001-order-dependency-boundaries.md`: why these boundaries exist.
