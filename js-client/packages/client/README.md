# @genkit-ai/client

Headless, browser-safe client for invoking Genkit actions over the callable HTTP protocol.

## Installation

```bash
pnpm add @genkit-ai/client
```

## Quick Start

```typescript
import { createGenkitClient } from '@genkit-ai/client';

const client = createGenkitClient({ baseUrl: 'https://example.com/api' });

const echo = await client.runAction({
  url: '/echo',
  input: { text: 'hello' },
});

const response = client.streamAction({
  url: '/countStream',
  input: { to: 5 },
});

for await (const chunk of response.stream) {
  console.log(chunk);
}
console.log(await response.output);
```

## API

`runAction({ url, input, headers, abortSignal })`

Sends `POST { "data": input }` and returns the unwrapped `{ result }`.

`streamAction({ url, input, streamId, headers, abortSignal })`

Sends the same callable request with `Accept: text/event-stream`, yields `message` chunks, resolves the final `result`, and exposes `streamId` from `x-genkit-stream-id` when the server supports durable streams.

`createGenkitClient({ baseUrl, headers, fetch, transport })`

Creates a reusable client. `headers` can be static or async, and per-call headers override client headers.

## Type Safety

```typescript
import type { greetingFlow } from '@/server/flows';
import { runAction, streamAction } from '@genkit-ai/client';

const greeting = await runAction<typeof greetingFlow>({
  url: '/api/greeting',
  input: { name: 'World' },
});

const stream = streamAction<typeof greetingFlow>({
  url: '/api/greeting',
  input: { name: 'World' },
});
```

`Input<A>`, `Output<A>`, and `StreamChunk<A>` are exported for shared app types.

## Errors

Server errors are surfaced as `GenkitClientError` with:

- `status`: Genkit status name, such as `INVALID_ARGUMENT`
- `details`: callable protocol error details
- `httpStatus`: HTTP status when available
- `traceId`: `x-genkit-trace-id` when available

```typescript
try {
  await client.runAction({ url: '/secureEcho', input: { text: 'secret' } });
} catch (err) {
  if (err instanceof GenkitClientError) {
    console.error(err.status, err.details);
  }
}
```

## Migration

`runFlow` and `streamFlow` remain available as deprecated aliases for compatibility with `genkit/beta/client`. New code should use `runAction` and `streamAction`.

## Testing

```bash
pnpm --filter @genkit-ai/client test:unit
pnpm --filter @genkit-ai/client test:integration
pnpm --filter @genkit-ai/client test:types
```

Unit tests use mock transports. Integration tests run against `@genkit-ai/client-test-server` with deterministic flows and no external API keys.

