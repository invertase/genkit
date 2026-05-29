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
import { CallableTransport, resolveUrl } from '../../src/index.js';

describe('resolveUrl', () => {
  it('prefixes relative paths with baseUrl', () => {
    assert.equal(
      resolveUrl('/echo', 'http://localhost:3000/api'),
      'http://localhost:3000/api/echo'
    );
    assert.equal(resolveUrl('echo', '/api'), '/api/echo');
  });

  it('leaves absolute URLs unchanged', () => {
    assert.equal(
      resolveUrl('https://example.test/echo', 'http://localhost:3000/api'),
      'https://example.test/echo'
    );
  });
});

describe('CallableTransport', () => {
  it('sends callable protocol requests', async () => {
    let capturedUrl: string | URL | Request | undefined;
    let capturedInit: RequestInit | undefined;
    const transport = new CallableTransport({
      baseUrl: 'http://localhost:3000/api',
      fetch: async (url, init) => {
        capturedUrl = url;
        capturedInit = init;
        return Response.json({ result: 'ok' });
      },
    });

    await transport.request({
      url: '/echo',
      input: { text: 'hello' },
    });

    assert.equal(capturedUrl, 'http://localhost:3000/api/echo');
    assert.equal(capturedInit?.method, 'POST');
    assert.equal(capturedInit?.body, '{"data":{"text":"hello"}}');
    assert.equal(
      new Headers(capturedInit?.headers).get('Content-Type'),
      'application/json'
    );
  });

  it('merges dynamic headers and per-call headers', async () => {
    let headers = new Headers();
    const transport = new CallableTransport({
      headers: async () => ({ Authorization: 'Bearer client-token' }),
      fetch: async (_url, init) => {
        headers = new Headers(init?.headers);
        return Response.json({ result: 'ok' });
      },
    });

    await transport.request({
      url: '/echo',
      headers: { 'x-request-id': 'req-1' },
    });

    assert.equal(headers.get('Authorization'), 'Bearer client-token');
    assert.equal(headers.get('x-request-id'), 'req-1');
  });

  it('adds streaming and durable stream headers', async () => {
    let headers = new Headers();
    const controller = new AbortController();
    let signal: AbortSignal | null | undefined;
    const transport = new CallableTransport({
      fetch: async (_url, init) => {
        headers = new Headers(init?.headers);
        signal = init?.signal;
        return new Response(null, { status: 204 });
      },
    });

    await transport.request({
      url: '/count',
      stream: true,
      streamId: 'stream-1',
      abortSignal: controller.signal,
    });

    assert.equal(headers.get('Accept'), 'text/event-stream');
    assert.equal(headers.get('x-genkit-stream-id'), 'stream-1');
    assert.equal(signal, controller.signal);
  });
});

