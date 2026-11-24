# ADR 0001: Keep order dependencies pointing inward

- Status: Accepted
- Date: 2026-11-20

## Context

The order workflow needs validation, persistence, and an HTTP entry point. If domain code imports a database adapter or request object, the business rules become coupled to delivery and storage details. It becomes harder to test the rules independently and harder to replace an adapter.

## Decision

Use four small layers for this example:

- Domain owns order invariants.
- Application coordinates the use case and receives dependencies from its caller.
- Infrastructure implements persistence adapters.
- HTTP translates transport input and output.

Dependencies point from HTTP to application and from application to domain. Infrastructure implements the repository shape required by the application without being imported by it.

## Consequences

- The use case can be tested with an in-memory adapter.
- HTTP behavior can be tested without a web framework.
- A database adapter can be replaced without changing the domain model.
- The example has more files than a one-function demo. That separation is intentional so the boundaries are visible.

## Rejected alternative

Putting validation, persistence, and HTTP handling in one route handler would be shorter, but it would obscure the exact architecture constraints this repository is intended to demonstrate.
