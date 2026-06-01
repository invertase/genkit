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
import { act, renderHook } from '@testing-library/react';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { useAction } from '../src/index.js';
import './setup.js';
import { clientFor, deferred, wrapperFor } from './test-utils.js';

describe('useAction', () => {
  it('tracks loading and data state', async () => {
    const response = deferred<Response>();
    const client = clientFor(() => response.promise);
    const { result } = renderHook(() => useAction({ url: '/echo' }), {
      wrapper: wrapperFor(client),
    });

    let runPromise!: Promise<unknown>;
    act(() => {
      runPromise = result.current.execute({ text: 'hello' });
    });

    assert.equal(result.current.isLoading, true);
    assert.equal(result.current.data, undefined);

    await act(async () => {
      response.resolve(Response.json({ result: { text: 'hello' } }));
      await runPromise;
    });

    assert.equal(result.current.isLoading, false);
    assert.deepEqual(result.current.data, { text: 'hello' });
    assert.equal(result.current.error, undefined);
  });

  it('tracks callable errors', async () => {
    const client = clientFor(() =>
      Response.json(
        {
          status: 'PERMISSION_DENIED',
          message: 'not allowed',
        },
        { status: 403 }
      )
    );
    const { result } = renderHook(() => useAction({ url: '/secure' }), {
      wrapper: wrapperFor(client),
    });

    await act(async () => {
      await assert.rejects(result.current.execute({ text: 'secret' }));
    });

    assert.equal(result.current.isLoading, false);
    assert.equal(result.current.error instanceof GenkitClientError, true);
    assert.equal(
      (result.current.error as GenkitClientError).status,
      'PERMISSION_DENIED'
    );
  });

  it('resets state', async () => {
    const client = clientFor(() => Response.json({ result: 'ok' }));
    const { result } = renderHook(() => useAction({ url: '/echo' }), {
      wrapper: wrapperFor(client),
    });

    await act(async () => {
      await result.current.execute();
    });
    assert.equal(result.current.data, 'ok');

    act(() => result.current.reset());
    assert.equal(result.current.data, undefined);
    assert.equal(result.current.error, undefined);
    assert.equal(result.current.isLoading, false);
  });
});
