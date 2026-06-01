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

'use client';

import type {
  Action,
  GenkitClient,
  Input,
  Output,
  StreamChunk,
} from '@genkit-ai/client';
import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { useGenkitClient } from './context.js';
import {
  createStreamExecutor,
  type ActionStatus,
} from './internal/stream-state.js';

export interface UseStreamOptions {
  url: string;
  client?: GenkitClient;
  headers?: HeadersInit;
}

export interface UseStreamResult<TInput, TChunk, TOutput> {
  execute: (input?: TInput) => Promise<TOutput>;
  abort: () => void;
  reset: () => void;
  chunks: TChunk[];
  data: TOutput | undefined;
  error: Error | undefined;
  status: ActionStatus;
  isStreaming: boolean;
  streamId: string | null;
}

export function useStream<A extends Action = Action>(
  options: UseStreamOptions
): UseStreamResult<Input<A>, StreamChunk<A>, Output<A>> {
  const contextClient = useGenkitClient();
  const client = options.client ?? contextClient;
  const executor = useMemo(
    () =>
      createStreamExecutor<Input<A>, StreamChunk<A>, Output<A>>({
        client,
        url: options.url,
        headers: options.headers,
      }),
    [client, options.headers, options.url]
  );
  const state = useSyncExternalStore(
    executor.subscribe,
    executor.getState,
    executor.getState
  );

  const execute = useCallback(
    (input?: Input<A>) => executor.execute(input),
    [executor]
  );
  const abort = useCallback(() => executor.abort(), [executor]);
  const reset = useCallback(() => executor.reset(), [executor]);

  useEffect(() => abort, [abort]);

  return {
    execute,
    abort,
    reset,
    chunks: state.chunks,
    data: state.data,
    error: state.error,
    status: state.status,
    isStreaming: state.status === 'streaming',
    streamId: state.streamId,
  };
}
