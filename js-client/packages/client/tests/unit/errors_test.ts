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
  extractWireError,
  GenkitClientError,
  isHttpErrorWireFormat,
  statusNameFromHttpStatus,
} from '../../src/index.js';

describe('GenkitClientError', () => {
  it('parses callable wire errors', () => {
    const response = new Response('', {
      status: 403,
      headers: { 'x-genkit-trace-id': 'trace-1' },
    });
    const error = GenkitClientError.fromWire(
      {
        status: 'PERMISSION_DENIED',
        message: 'not authorized',
        details: { reason: 'missing-token' },
      },
      response
    );

    assert.equal(error.name, 'GenkitClientError');
    assert.equal(error.status, 'PERMISSION_DENIED');
    assert.equal(error.httpStatus, 403);
    assert.equal(error.traceId, 'trace-1');
    assert.deepEqual(error.details, { reason: 'missing-token' });
    assert.equal(error.message, 'PERMISSION_DENIED: not authorized');
  });

  it('parses top-level non-200 response bodies', () => {
    const response = new Response(
      JSON.stringify({
        status: 'INVALID_ARGUMENT',
        message: 'bad input',
      }),
      { status: 400 }
    );
    const error = GenkitClientError.fromResponse(
      response,
      '{"status":"INVALID_ARGUMENT","message":"bad input"}'
    );

    assert.equal(error.status, 'INVALID_ARGUMENT');
    assert.equal(error.httpStatus, 400);
    assert.equal(error.message, 'INVALID_ARGUMENT: bad input');
  });

  it('falls back to HTTP status names for opaque errors', () => {
    const response = new Response('gateway down', { status: 503 });
    const error = GenkitClientError.fromResponse(response, 'gateway down');

    assert.equal(error.status, 'UNAVAILABLE');
    assert.equal(error.httpStatus, 503);
    assert.match(error.message, /Server returned 503/);
  });

  it('identifies supported wire error shapes', () => {
    assert.equal(
      isHttpErrorWireFormat({
        status: 'NOT_FOUND',
        message: 'missing',
      }),
      true
    );
    assert.equal(
      isHttpErrorWireFormat({
        status: 'NOT_A_STATUS',
        message: 'missing',
      }),
      false
    );
    assert.deepEqual(
      extractWireError({
        error: {
          status: 'INTERNAL',
          message: 'boom',
        },
      }),
      { status: 'INTERNAL', message: 'boom' }
    );
  });

  it('maps common HTTP statuses to Genkit status names', () => {
    assert.equal(statusNameFromHttpStatus(401), 'UNAUTHENTICATED');
    assert.equal(statusNameFromHttpStatus(404), 'NOT_FOUND');
    assert.equal(statusNameFromHttpStatus(418), 'UNKNOWN');
  });
});

