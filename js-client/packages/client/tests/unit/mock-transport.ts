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

import type { Transport, TransportRequest } from '../../src/index.js';

export type MockHandler = (
  req: TransportRequest
) => Response | Promise<Response>;

export class MockTransport implements Transport {
  readonly requests: TransportRequest[] = [];

  constructor(private readonly handlers: Record<string, MockHandler>) {}

  async request(req: TransportRequest): Promise<Response> {
    this.requests.push(req);
    const handler = this.handlers[req.url] ?? this.handlers['*'];
    if (!handler) {
      throw new Error(`No mock handler for ${req.url}`);
    }
    return await handler(req);
  }
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
