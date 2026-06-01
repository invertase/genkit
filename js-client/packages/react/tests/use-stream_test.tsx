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

import { GenkitClientError } from '@genkit-ai/client';
import { act, renderHook, waitFor } from '@testing-library/react';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { useStream } from '../src/index.js';
import './setup.js';
import { clientFor, streamResponse, wrapperFor } from './test-utils.js';

describe('useStream', () => {
  it('accumulates stream chunks and final output', async () => {
    const client = clientFor(() =>
      streamResponse(
        [
          'data: {"message":1}\n\n',
          'data: {"message":2}\n\n',
          'data: {"result":{"count":2}}\n\n',
        ],
        { headers: { 'x-genkit-stream-id': 'stream-1' } }
      )
    );
    const { result } = renderHook(() => useStream({ url: '/count' }), {
      wrapper: wrapperFor(client),
    });

    let outputPromise!: Promise<unknown>;
    act(() => {
      outputPromise = result.current.execute({ to: 2 });
    });

    assert.equal(result.current.isStreaming, true);

    await waitFor(() => {
      assert.deepEqual(result.current.chunks, [1, 2]);
    });

    await act(async () => {
      assert.deepEqual(await outputPromise, { count: 2 });
    });

    assert.equal(result.current.isStreaming, false);
    assert.equal(result.current.streamId, 'stream-1');
    assert.deepEqual(result.current.data, { count: 2 });
  });

  it('tracks stream errors', async () => {
    const client = clientFor(() =>
      streamResponse([
        'error: {"error":{"status":"UNAVAILABLE","message":"try later"}}\n\n',
      ])
    );
    const { result } = renderHook(() => useStream({ url: '/fail' }), {
      wrapper: wrapperFor(client),
    });

    await act(async () => {
      await assert.rejects(result.current.execute());
    });

    assert.equal(result.current.status, 'error');
    assert.equal(result.current.error instanceof GenkitClientError, true);
    assert.equal(
      (result.current.error as GenkitClientError).status,
      'UNAVAILABLE'
    );
  });

  it('can reset accumulated stream state', async () => {
    const client = clientFor(() =>
      streamResponse([
        'data: {"message":"a"}\n\n',
        'data: {"result":"done"}\n\n',
      ])
    );
    const { result } = renderHook(() => useStream({ url: '/letters' }), {
      wrapper: wrapperFor(client),
    });

    await act(async () => {
      await result.current.execute();
    });
    assert.deepEqual(result.current.chunks, ['a']);
    assert.equal(result.current.data, 'done');

    act(() => result.current.reset());
    assert.deepEqual(result.current.chunks, []);
    assert.equal(result.current.data, undefined);
    assert.equal(result.current.status, 'idle');
  });
});
