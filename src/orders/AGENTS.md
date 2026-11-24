# Order module instructions

Read `docs/architecture/orders.md` before changing this module.

## Dependency direction

- `domain/` may depend only on files in `domain/`.
- `application/` may depend on `application/` and `domain/`.
- `infrastructure/` may depend on `infrastructure/` and `domain/`.
- `http/` may depend on `http/` and `application/`.
- Do not import repositories, HTTP objects, framework code, or provider SDKs into `domain/`.
- Do not let application use cases import concrete infrastructure adapters. Inject dependencies through function arguments.

## Order model

- Store money as integer cents. Do not use floating-point currency amounts.
- Validate order identifiers, SKUs, quantities, and unit prices at the domain boundary.
- Keep the order immutable after creation.
- Preserve the existing error boundary: domain validation errors are translated by the application layer into `InvalidOrderInputError`.

## Verification

- Add or update behavior tests for every use-case change.
- Run `npm run check` before reporting completion.
