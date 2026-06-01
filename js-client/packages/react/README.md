# @genkit-ai/react

React hooks for building UIs on top of `@genkit-ai/client`.

## Installation

```bash
pnpm add @genkit-ai/react @genkit-ai/client
```

## Provider

```tsx
'use client';

import { GenkitClientProvider } from '@genkit-ai/react';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <GenkitClientProvider
      config={{
        baseUrl: '/api',
        headers: () => ({ Authorization: `Bearer ${token}` }),
      }}
    >
      {children}
    </GenkitClientProvider>
  );
}
```

You can also pass a prebuilt `client` from `createGenkitClient`.

## useAction

```tsx
import { useAction } from '@genkit-ai/react';
import type { greetingFlow } from '@/server/flows';

export function Greeting() {
  const { execute, data, error, isLoading, reset } =
    useAction<typeof greetingFlow>({ url: '/api/greeting' });

  return (
    <button
      disabled={isLoading}
      onClick={() => void execute({ name: 'World' })}
    >
      Greet
    </button>
  );
}
```

`useAction` returns `execute`, `abort`, `reset`, `data`, `error`, and `isLoading`.

## useStream

```tsx
import { useStream } from '@genkit-ai/react';
import type { countStreamFlow } from '@/server/flows';

export function Counter() {
  const { execute, chunks, data, error, isStreaming, abort } =
    useStream<typeof countStreamFlow>({ url: '/api/countStream' });

  return (
    <button disabled={isStreaming} onClick={() => void execute({ to: 5 })}>
      Stream
    </button>
  );
}
```

`useStream` returns `execute`, `abort`, `reset`, `chunks`, `data`, `error`, `status`, `isStreaming`, and `streamId`.

## Testing

Hook tests use `@testing-library/react` with mock `@genkit-ai/client` transports.

```bash
pnpm --filter @genkit-ai/react test
```

## Vite Example

See `js-client/examples/vite-react` for a working app that calls the deterministic integration server.

