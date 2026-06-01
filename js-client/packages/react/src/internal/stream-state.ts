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

import type { GenkitClient, StreamActionResult } from '@genkit-ai/client';
import { isAbortError } from './abort-error.js';

export type ActionStatus = 'idle' | 'loading' | 'streaming' | 'error';

export interface StreamState<TChunk, TOutput> {
  status: ActionStatus;
  chunks: TChunk[];
  data: TOutput | undefined;
  error: Error | undefined;
  streamId: string | null;
}

export interface StreamExecutor<TInput, TChunk, TOutput> {
  execute: (input?: TInput) => Promise<TOutput>;
  abort: () => void;
  reset: () => void;
  subscribe: (listener: () => void) => () => void;
  getState: () => StreamState<TChunk, TOutput>;
}

export function createStreamExecutor<TInput, TChunk, TOutput>(options: {
  client: GenkitClient;
  url: string;
  headers?: HeadersInit;
}): StreamExecutor<TInput, TChunk, TOutput> {
  const listeners = new Set<() => void>();
  let controller: AbortController | undefined;
  let executionId = 0;
  let state = initialState<TChunk, TOutput>();

  function setState(next: StreamState<TChunk, TOutput>): void {
    state = next;
    listeners.forEach((listener) => listener());
  }

  function execute(input?: TInput): Promise<TOutput> {
    executionId += 1;
    const currentExecution = executionId;
    controller?.abort();
    controller = new AbortController();

    setState({
      status: 'streaming',
      chunks: [],
      data: undefined,
      error: undefined,
      streamId: null,
    });

    const response = options.client.streamAction({
      url: options.url,
      input,
      headers: options.headers,
      abortSignal: controller.signal,
    }) as StreamActionResult<TOutput, TChunk>;

    response.streamId.then(
      (streamId) => {
        if (currentExecution === executionId) {
          setState({ ...state, streamId });
        }
      },
      () => undefined
    );

    return (async () => {
      try {
        for await (const chunk of response.stream) {
          if (currentExecution !== executionId) {
            continue;
          }
          setState({
            ...state,
            chunks: [...state.chunks, chunk],
          });
        }

        const output = await response.output;
        if (currentExecution === executionId) {
          setState({
            ...state,
            status: 'idle',
            data: output,
            error: undefined,
          });
          controller = undefined;
        }
        return output;
      } catch (error) {
        if (currentExecution === executionId) {
          if (isAbortError(error)) {
            setState({ ...state, status: 'idle' });
          } else {
            setState({
              ...state,
              status: 'error',
              error: error instanceof Error ? error : new Error(String(error)),
            });
          }
          controller = undefined;
        }
        throw error;
      }
    })();
  }

  function abort(): void {
    if (!controller) {
      return;
    }
    executionId += 1;
    controller.abort();
    controller = undefined;
    if (state.status === 'streaming' || state.status === 'loading') {
      setState({ ...state, status: 'idle' });
    }
  }

  function reset(): void {
    abort();
    setState(initialState());
  }

  return {
    execute,
    abort,
    reset,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getState: () => state,
  };
}

function initialState<TChunk, TOutput>(): StreamState<TChunk, TOutput> {
  return {
    status: 'idle',
    chunks: [],
    data: undefined,
    error: undefined,
    streamId: null,
  };
}
