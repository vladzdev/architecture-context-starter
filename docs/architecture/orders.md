# Order module architecture

## Responsibilities

### Domain

`domain/order.mjs` creates an order and protects its invariants. It validates the identifier, item list, SKU, quantity, unit price, and timestamp. It calculates totals using integer cents and returns an immutable value.

The domain module does not know whether an order is stored in memory, a database, or an external service. It does not know about HTTP requests or responses.

### Application

`application/place-order.mjs` implements the place-order use case. It receives its dependencies from the outside:

- `orderRepository.save(order)` persists the created order.
- `idGenerator()` supplies an identifier.
- `clock()` supplies the current time.

The application layer translates domain validation errors into `InvalidOrderInputError`, which the transport layer can handle without importing the domain implementation directly.

### Infrastructure

`infrastructure/in-memory-order-repository.mjs` is a replaceable adapter used by the example and its tests. A real application could provide a database-backed implementation of the same `save`/`findById` contract.

### HTTP

`http/create-order-handler.mjs` parses the request, calls the use case, and maps invalid input to HTTP 400. It does not calculate totals or access persistence.

## Dependency rules

The direction is intentionally asymmetric:

```text
http            -> application
application     -> domain
infrastructure  -> domain
```

Each layer may also import files in its own layer. No inward layer may import an outer layer. In particular:

- Domain must not import application, infrastructure, or HTTP.
- Application must not import concrete infrastructure or HTTP.
- Infrastructure must not import application or HTTP.
- HTTP must not import infrastructure or domain implementation details.

The application layer depends on a repository contract by shape, not on a concrete repository class. The example uses dependency injection rather than adding a framework or a DI container.

## Why integer cents?

JavaScript numbers use binary floating-point arithmetic. Storing prices as integer cents avoids common rounding surprises in this deliberately small example. A production system still needs explicit currency, tax, rounding, and precision policies.

## Verification

`npm run check:architecture` checks local static ESM imports inside `src/orders/` against the layer rules. The checker intentionally rejects dynamic imports, CommonJS, Node built-ins, and external packages in this sample. It is deliberately small and should not be mistaken for a complete parser or a substitute for a mature architecture-analysis tool in a larger codebase.
