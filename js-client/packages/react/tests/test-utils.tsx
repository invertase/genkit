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

import {
  createGenkitClient,
  type GenkitClient,
  type Transport,
  type TransportRequest,
} from '@genkit-ai/client';
import { type ReactNode } from 'react';
import { GenkitClientProvider } from '../src/index.js';

export interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
}

export function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

export function streamResponse(
  chunks: string[],
  init?: ResponseInit
): Response {
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(encoder.encode(chunk));
        }
        controller.close();
      },
    }),
    init
  );
}

export function clientFor(
  handler: (request: TransportRequest) => Response | Promise<Response>
): GenkitClient {
  const transport: Transport = {
    request: handler,
  };
  return createGenkitClient({ transport });
}

export function wrapperFor(client: GenkitClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <GenkitClientProvider client={client}>{children}</GenkitClientProvider>
    );
  };
}
