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

describe('integration server (Phase 1 prerequisite)', () => {
  let baseUrl: string;
  let close: () => Promise<void>;

  before(async () => {
    ({ url: baseUrl, close } = await startTestServer());
  });

  after(async () => {
    await close();
  });

  it('serves echo flow via callable protocol', async () => {
    const response = await fetch(`${baseUrl}/api/echo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: { text: 'hello' } }),
    });
    assert.equal(response.status, 200);
    const json = (await response.json()) as { result: { text: string } };
    assert.deepEqual(json.result, { text: 'hello' });
  });

  it('serves countStream flow with SSE chunks', async () => {
    const response = await fetch(`${baseUrl}/api/countStream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({ data: { to: 3 } }),
    });
    assert.equal(response.status, 200);
    const text = await response.text();
    assert.match(text, /"message":1/);
    assert.match(text, /"message":2/);
    assert.match(text, /"message":3/);
    assert.match(text, /"result":\{"count":3\}/);
  });

  it('returns PERMISSION_DENIED for secureEcho without auth', async () => {
    const response = await fetch(`${baseUrl}/api/secureEcho`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: { text: 'secret' } }),
    });
    assert.notEqual(response.status, 200);
  });
});
