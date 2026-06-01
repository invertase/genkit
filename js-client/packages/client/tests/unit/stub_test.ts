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
  CallableTransport,
  GenkitClientError,
  createGenkitClient,
  runAction,
  runFlow,
  streamAction,
  streamFlow,
} from '../../src/index.js';

describe('@genkit-ai/client public exports', () => {
  it('exports the headless client API', () => {
    assert.equal(typeof CallableTransport, 'function');
    assert.equal(typeof createGenkitClient, 'function');
    assert.equal(typeof GenkitClientError, 'function');
    assert.equal(typeof runAction, 'function');
    assert.equal(typeof streamAction, 'function');
    assert.equal(typeof runFlow, 'function');
    assert.equal(typeof streamFlow, 'function');
  });
});
