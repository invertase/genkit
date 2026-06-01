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

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  GenkitClientError,
  createGenkitClient,
  runFlow,
  streamFlow,
} from '../../src/index.js';
import { MockTransport, streamResponse } from './mock-transport.js';

describe('createGenkitClient', () => {
  it('runs actions through an injected transport', async () => {
    const transport = new MockTransport({
      '/echo': (req) => Response.json({ result: { text: req.input } }),
    });
    const client = createGenkitClient({ transport });

    const result = await client.runAction({
      url: '/echo',
      input: 'hello',
    });

    assert.deepEqual(result, { text: 'hello' });
    assert.deepEqual(transport.requests[0], {
      url: '/echo',
      input: 'hello',
      headers: undefined,
      abortSignal: undefined,
    });
  });

  it('streams chunks and resolves output', async () => {
    const transport = new MockTransport({
      '/count': () =>
        streamResponse(
          [
            'data: {"message":0}\n\n',
            'data: {"message":1}\n\n',
            'data: {"result":{"count":2}}\n\n',
          ],
          { headers: { 'x-genkit-stream-id': 'stream-123' } }
        ),
    });
    const client = createGenkitClient({ transport });

    const response = client.streamAction({
      url: '/count',
      input: { to: 2 },
    });
    const chunks: number[] = [];
    for await (const chunk of response.stream) {
      chunks.push(chunk as number);
    }

    assert.deepEqual(chunks, [0, 1]);
    assert.deepEqual(await response.output, { count: 2 });
    assert.equal(await response.streamId, 'stream-123');
    assert.equal(transport.requests[0].stream, true);
  });

  it('propagates stream errors to output and stream consumers', async () => {
    const transport = new MockTransport({
      '/fail': () =>
        streamResponse([
          'error: {"error":{"status":"UNAVAILABLE","message":"try later"}}\n\n',
        ]),
    });
    const client = createGenkitClient({ transport });

    const response = client.streamAction({ url: '/fail' });

    await assert.rejects(
      async () => {
        for await (const _ of response.stream) {
        }
      },
      (error) => {
        assert.equal((error as GenkitClientError).status, 'UNAVAILABLE');
        return true;
      }
    );
    await assert.rejects(response.output, GenkitClientError);
  });

  it('keeps runFlow and streamFlow aliases backward compatible', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (_url, init) => {
      const headers = new Headers(init?.headers);
      if (headers.get('Accept') === 'text/event-stream') {
        return streamResponse(['data: {"result":"stream-ok"}\n\n']);
      }
      return Response.json({ result: 'run-ok' });
    }) as typeof fetch;

    try {
      assert.equal(await runFlow({ url: '/run' }), 'run-ok');
      const streamResult = streamFlow<string>({ url: '/stream' });
      assert.equal(await streamResult.output, 'stream-ok');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
