# @genkit-ai/client-test-server

Deterministic Genkit flows served over Hono + `@genkit-ai/fetch` for `@genkit-ai/client` integration tests.

**No LLM calls. No API keys required.**

## Flows

| Endpoint | Method | Description |
| --- | --- | --- |
| `POST /api/echo` | Non-stream | Echoes `{ text }` input |
| `POST /api/add` | Non-stream | Returns `{ sum: a + b }` |
| `POST /api/countStream` | Stream | Emits `1..to` as chunks, returns `{ count: to }` |
| `POST /api/secureEcho` | Non-stream | Requires `Authorization: Bearer test-token` |
| `POST /api/failWithStatus` | Non-stream | Throws `UserFacingError` with requested status |

## Standalone

```bash
pnpm --filter @genkit-ai/client-test-server start
# POST http://localhost:3781/api/echo  body: { "data": { "text": "hello" } }
```

## Programmatic (integration tests)

```typescript
import { startTestServer } from '@genkit-ai/client-test-server';

const { url, close } = await startTestServer();
try {
  await fetch(`${url}/api/echo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: { text: 'hello' } }),
  });
} finally {
  await close();
}
```

## See also

- [DEVELOPMENT.md](../../DEVELOPMENT.md) — Phase 1.3
