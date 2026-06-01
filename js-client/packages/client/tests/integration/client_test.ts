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

import { startTestServer } from '@genkit-ai/client-test-server';
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import {
  GenkitClientError,
  createGenkitClient,
  type GenkitClient,
} from '../../src/index.js';

describe('@genkit-ai/client integration', () => {
  let client: GenkitClient;
  let close: () => Promise<void>;

  before(async () => {
    const server = await startTestServer();
    close = server.close;
    client = createGenkitClient({ baseUrl: `${server.url}/api` });
  });

  after(async () => {
    await close();
  });

  it('runs echo over the callable protocol', async () => {
    const result = await client.runAction({
      url: '/echo',
      input: { text: 'hello' },
    });

    assert.deepEqual(result, { text: 'hello' });
  });

  it('runs typed JSON inputs and outputs', async () => {
    const result = await client.runAction({
      url: '/add',
      input: { a: 2, b: 3 },
    });

    assert.deepEqual(result, { sum: 5 });
  });

  it('streams chunks and final output', async () => {
    const response = client.streamAction({
      url: '/countStream',
      input: { to: 3 },
    });

    const chunks: number[] = [];
    for await (const chunk of response.stream) {
      chunks.push(chunk as number);
    }

    assert.deepEqual(chunks, [1, 2, 3]);
    assert.deepEqual(await response.output, { count: 3 });
  });

  it('passes auth headers through the transport', async () => {
    const authedClient = createGenkitClient({
      baseUrl: '/api',
      transport: client.transport,
    });
    const result = await authedClient.runAction({
      url: '/secureEcho',
      input: { text: 'secret' },
      headers: { Authorization: 'Bearer test-token' },
    });

    assert.deepEqual(result, { text: 'secret' });
  });

  it('surfaces permission errors as GenkitClientError', async () => {
    await assert.rejects(
      client.runAction({
        url: '/secureEcho',
        input: { text: 'secret' },
      }),
      (error) => {
        const clientError = error as GenkitClientError;
        assert.equal(clientError.status, 'PERMISSION_DENIED');
        assert.equal(clientError.httpStatus, 403);
        return true;
      }
    );
  });

  it('surfaces requested server status errors', async () => {
    await assert.rejects(
      client.runAction({
        url: '/failWithStatus',
        input: { status: 'FAILED_PRECONDITION' },
      }),
      (error) => {
        const clientError = error as GenkitClientError;
        assert.equal(clientError.status, 'FAILED_PRECONDITION');
        assert.equal(clientError.httpStatus, 400);
        return true;
      }
    );
  });
});
