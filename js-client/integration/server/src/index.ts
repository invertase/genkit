/**
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { fetchHandlers, withActionOptions } from '@genkit-ai/fetch';
import { serve } from '@hono/node-server';
import type { ServerType } from '@hono/node-server';
import {
  genkit,
  UserFacingError,
  z,
  type StatusName,
} from 'genkit';
import type { ContextProvider } from 'genkit/context';
import getPort from 'get-port';
import { Hono } from 'hono';
import { cors } from 'hono/cors';

const ai = genkit({});

const authContextProvider: ContextProvider<{ userId: string }> = (req) => {
  if (req.headers['authorization'] !== 'Bearer test-token') {
    throw new UserFacingError(
      'PERMISSION_DENIED',
      'Missing or invalid Authorization header'
    );
  }
  return { userId: 'test-user' };
};

export const echoFlow = ai.defineFlow(
  {
    name: 'echo',
    inputSchema: z.object({ text: z.string() }),
    outputSchema: z.object({ text: z.string() }),
  },
  async (input) => ({ text: input.text })
);

export const addFlow = ai.defineFlow(
  {
    name: 'add',
    inputSchema: z.object({ a: z.number(), b: z.number() }),
    outputSchema: z.object({ sum: z.number() }),
  },
  async (input) => ({ sum: input.a + input.b })
);

export const countStreamFlow = ai.defineFlow(
  {
    name: 'countStream',
    inputSchema: z.object({ to: z.number() }),
    outputSchema: z.object({ count: z.number() }),
    streamSchema: z.number(),
  },
  async (input, { sendChunk }) => {
    for (let i = 1; i <= input.to; i++) {
      sendChunk(i);
    }
    return { count: input.to };
  }
);

export const secureEchoFlow = ai.defineFlow(
  {
    name: 'secureEcho',
    inputSchema: z.object({ text: z.string() }),
    outputSchema: z.object({ text: z.string() }),
  },
  async (input) => ({ text: input.text })
);

export const failWithStatusFlow = ai.defineFlow(
  {
    name: 'failWithStatus',
    inputSchema: z.object({ status: z.string() }),
  },
  async (input) => {
    throw new UserFacingError(
      input.status as StatusName,
      `Intentional ${input.status} error`
    );
  }
);

export const testActions = [
  echoFlow,
  addFlow,
  countStreamFlow,
  withActionOptions(secureEchoFlow, {
    contextProvider: authContextProvider,
  }),
  failWithStatusFlow,
];

export function createTestApp() {
  const app = new Hono();
  app.use(
    '/api/*',
    cors({
      origin: '*',
      allowHeaders: [
        'Accept',
        'Authorization',
        'Content-Type',
        'x-genkit-stream-id',
      ],
      allowMethods: ['POST', 'OPTIONS'],
      exposeHeaders: [
        'x-genkit-span-id',
        'x-genkit-stream-id',
        'x-genkit-trace-id',
      ],
    })
  );
  app.get('/', (c) =>
    c.json({
      message: 'Genkit client integration test server',
      actions: testActions.map((a) =>
        'action' in a ? a.action.name : a.name
      ),
    })
  );
  app.all('/api/*', (c) => fetchHandlers(testActions, '/api')(c.req.raw));
  return app;
}

export interface TestServerHandle {
  url: string;
  port: number;
  close: () => Promise<void>;
}

/**
 * Starts the Hono test server on an ephemeral port.
 * Used by @genkit-ai/client integration tests.
 */
export async function startTestServer(
  port?: number
): Promise<TestServerHandle> {
  const resolvedPort = port ?? (await getPort());
  const app = createTestApp();
  let server: ServerType | undefined;

  await new Promise<void>((resolve) => {
    server = serve({ fetch: app.fetch, port: resolvedPort }, () => resolve());
  });

  const url = `http://127.0.0.1:${resolvedPort}`;

  return {
    url,
    port: resolvedPort,
    close: async () => {
      await new Promise<void>((resolve, reject) => {
        if (!server) {
          resolve();
          return;
        }
        server.close((err) => (err ? reject(err) : resolve()));
      });
    },
  };
}

// Standalone: pnpm --filter @genkit-ai/client-test-server start
