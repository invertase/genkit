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
import { GenkitClientError, parseResponse } from '../../src/index.js';

describe('parseResponse', () => {
  it('unwraps result envelopes', async () => {
    const result = await parseResponse<{ text: string }>(
      Response.json({ result: { text: 'hello' } })
    );

    assert.deepEqual(result, { text: 'hello' });
  });

  it('throws structured errors for string error envelopes', async () => {
    await assert.rejects(
      parseResponse(Response.json({ error: 'plain failure' })),
      (error) => {
        assert.equal(error instanceof GenkitClientError, true);
        assert.equal((error as GenkitClientError).status, 'UNKNOWN');
        assert.equal(
          (error as GenkitClientError).message,
          'UNKNOWN: plain failure'
        );
        return true;
      }
    );
  });

  it('throws structured errors for object error envelopes', async () => {
    await assert.rejects(
      parseResponse(
        Response.json({
          error: {
            status: 'PERMISSION_DENIED',
            message: 'not allowed',
            details: { policy: 'test' },
          },
        })
      ),
      (error) => {
        const clientError = error as GenkitClientError;
        assert.equal(clientError.status, 'PERMISSION_DENIED');
        assert.deepEqual(clientError.details, { policy: 'test' });
        return true;
      }
    );
  });

  it('throws structured errors for non-200 top-level callable errors', async () => {
    await assert.rejects(
      parseResponse(
        Response.json(
          {
            status: 'INVALID_ARGUMENT',
            message: 'bad request',
          },
          { status: 400 }
        )
      ),
      (error) => {
        const clientError = error as GenkitClientError;
        assert.equal(clientError.status, 'INVALID_ARGUMENT');
        assert.equal(clientError.httpStatus, 400);
        return true;
      }
    );
  });
});
