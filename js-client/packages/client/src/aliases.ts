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

import {
  runAction,
  streamAction,
  type RunActionRequest,
  type StreamActionRequest,
  type StreamActionResult,
} from './client.js';

/** @deprecated Use {@link runAction}. */
export function runFlow<TOutput = unknown, TInput = unknown>(
  req: RunActionRequest<TInput>
): Promise<TOutput> {
  return runAction(req as RunActionRequest) as Promise<TOutput>;
}

/** @deprecated Use {@link streamAction}. */
export function streamFlow<
  TOutput = unknown,
  TChunk = unknown,
  TInput = unknown,
>(req: StreamActionRequest<TInput>): StreamActionResult<TOutput, TChunk> {
  return streamAction(req as StreamActionRequest) as StreamActionResult<
    TOutput,
    TChunk
  >;
}
