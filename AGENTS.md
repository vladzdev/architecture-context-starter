# Repository instructions

This is a small Node.js example used to demonstrate architecture context for coding agents.

## Before changing code

- Read `docs/architecture/overview.md` for the repository map.
- Read `docs/architecture/orders.md` before changing the order module.
- Check `docs/decisions/` before changing a documented boundary.
- Prefer extending an existing pattern over adding a parallel abstraction.

## Architecture

- Keep domain rules independent of HTTP, persistence, and other infrastructure.
- Keep application use cases responsible for coordinating domain behavior and ports.
- Keep transport and persistence details in their respective outer layers.
- Follow the more specific instructions in a directory when working there.

## Verification

- Run `npm run check` after changing code or agent-context files.
- Do not claim a check passed unless you ran it and saw a successful exit.
- The architecture checker intentionally supports only local static ESM imports in `src/orders/`; do not describe it as a general-purpose analyzer.
- Keep this file short. Put detailed design explanations in `docs/architecture/`.
