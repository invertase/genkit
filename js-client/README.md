# Genkit JS Client Workspace

This workspace (`js-client/`) is a standalone pnpm monorepo for Genkit's browser-safe client layer and framework adapters. It is intentionally separate from the main `js/` workspace while the client API stabilizes.

## Packages

| Package | Path | Description |
| --- | --- | --- |
| `@genkit-ai/client` | `packages/client` | Headless callable-protocol client (`runAction`, `streamAction`) |
| `@genkit-ai/react` | `packages/react` | React hooks (`useAction`, `useStream`, …) |
| `@genkit-ai/client-test-server` | `integration/server` | Hono + `@genkit-ai/fetch` server for integration tests |
| `@genkit-ai/client-vite-react-example` | `examples/vite-react` | Vite React app exercising client + hooks |

## Quick start

```bash
# From repo root — build js libs first (client depends on genkit workspace packages)
cd js && pnpm i && pnpm build:core && pnpm build:genkit && pnpm -F @genkit-ai/fetch build

# Install and test the client workspace
cd ../js-client && pnpm i && pnpm test
```

## Documentation

- **[DEVELOPMENT.md](./DEVELOPMENT.md)** — Phased implementation plan (start here)
- **[CLIENT.md](../CLIENT.md)** — Strategic foundation and API design rationale
- **`packages/client/README.md`** — Headless client API reference (Phase 0 deliverable)
- **`packages/react/README.md`** — React hooks reference (Phase 3 deliverable)

## Testing strategy

All packages follow a two-tier test model:

1. **Unit tests (mocks)** — Protocol parsing, error mapping, transport logic. No network; uses `MockTransport` and fixture Response bodies.
2. **Integration tests (Hono + fetch)** — Real Genkit flows served via `@genkit-ai/fetch` on a local Hono server (`integration/server`). No LLM calls; flows are deterministic.

Run from this directory:

```bash
pnpm test:unit          # client unit tests only
pnpm test:integration   # client against integration server
pnpm test               # all packages
```

## Vite React example

Run the deterministic Genkit server and Vite app in separate terminals:

```bash
pnpm dev:server
pnpm dev:vite-react
```

Open `http://127.0.0.1:5173/`. Use `test-token` in the token field for the secure example.

## Relationship to main `js/` workspace

During bootstrap, `@genkit-ai/client` depends on `genkit` and `@genkit-ai/core` via `workspace:*` references that resolve through pnpm overrides pointing at `../js/*`. Once the client graduates, it will be published independently and the main `genkit/beta/client` module will re-export or delegate to `@genkit-ai/client`.
