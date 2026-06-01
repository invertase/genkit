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
  parseStreamEvent,
  parseStreamResponse,
} from '../../src/index.js';
import { streamResponse } from './mock-transport.js';

describe('parseStreamEvent', () => {
  it('parses data-prefixed message and result events', () => {
    assert.deepEqual(parseStreamEvent('data: {"message":1}'), {
      type: 'message',
      message: 1,
    });
    assert.deepEqual(parseStreamEvent('data: {"result":{"count":1}}'), {
      type: 'result',
      result: { count: 1 },
    });
  });

  it('parses error-prefixed events from fetchHandlers', () => {
    assert.deepEqual(
      parseStreamEvent(
        'error: {"error":{"status":"NOT_FOUND","message":"missing"}}'
      ),
      {
        type: 'error',
        error: { status: 'NOT_FOUND', message: 'missing' },
      }
    );
  });
});

describe('parseStreamResponse', () => {
  it('streams messages and resolves the final result', async () => {
    const chunks: number[] = [];
    const output = await parseStreamResponse<{ count: number }, number>(
      streamResponse([
        'data: {"message":1}\n\n',
        'data: {"message":2}\n\n',
        'data: {"result":{"count":2}}\n\n',
      ]),
      (chunk) => chunks.push(chunk)
    );

    assert.deepEqual(chunks, [1, 2]);
    assert.deepEqual(output, { count: 2 });
  });

  it('handles partial delimiters across reader chunks', async () => {
    const chunks: number[] = [];
    const output = await parseStreamResponse<{ done: boolean }, number>(
      streamResponse([
        'data: {"message":',
        '0}\n',
        '\ndata: {"result":{"done":true}}\n\n',
      ]),
      (chunk) => chunks.push(chunk)
    );

    assert.deepEqual(chunks, [0]);
    assert.deepEqual(output, { done: true });
  });

  it('throws structured errors for error chunks', async () => {
    await assert.rejects(
      parseStreamResponse(
        streamResponse([
          'data: {"message":1}\n\n',
          'error: {"error":{"status":"INTERNAL","message":"boom"}}\n\n',
        ]),
        () => undefined
      ),
      (error) => {
        const clientError = error as GenkitClientError;
        assert.equal(clientError.status, 'INTERNAL');
        assert.equal(clientError.message, 'INTERNAL: boom');
        return true;
      }
    );
  });

  it('throws NOT_FOUND for missing durable streams', async () => {
    await assert.rejects(
      parseStreamResponse(new Response(null, { status: 204 }), () => undefined),
      (error) => {
        const clientError = error as GenkitClientError;
        assert.equal(clientError.status, 'NOT_FOUND');
        assert.equal(clientError.message, 'NOT_FOUND: Stream not found.');
        return true;
      }
    );
  });

  it('resolves undefined when the stream ends after [DONE] without a result', async () => {
    const chunks: number[] = [];
    const output = await parseStreamResponse<undefined, number>(
      streamResponse(['data: {"message":1}\n\n', 'data: [DONE]\n\n']),
      (chunk) => chunks.push(chunk)
    );

    assert.deepEqual(chunks, [1]);
    assert.equal(output, undefined);
  });

  it('throws when the stream ends without a result or terminator', async () => {
    await assert.rejects(
      parseStreamResponse(
        streamResponse(['data: {"message":1}\n\n']),
        () => undefined
      ),
      (error) => {
        const clientError = error as GenkitClientError;
        assert.equal(
          clientError.message,
          'UNKNOWN: Stream ended before a result was received'
        );
        return true;
      }
    );
  });

  it('throws on unknown stream event formats', async () => {
    await assert.rejects(
      parseStreamResponse(streamResponse(['event: nope\n\n']), () => undefined),
      GenkitClientError
    );
  });
});
