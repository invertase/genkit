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

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import type {
  Action,
  GenkitClient,
  Input,
  Output,
} from '@genkit-ai/client';
import { useGenkitClient } from './context.js';
import { isAbortError } from './internal/abort-error.js';

export interface UseActionOptions {
  url: string;
  client?: GenkitClient;
  headers?: HeadersInit;
}

export interface UseActionResult<TInput, TOutput> {
  execute: (input?: TInput) => Promise<TOutput>;
  abort: () => void;
  reset: () => void;
  data: TOutput | undefined;
  error: Error | undefined;
  isLoading: boolean;
}

export function useAction<A extends Action = Action>(
  options: UseActionOptions
): UseActionResult<Input<A>, Output<A>> {
  const contextClient = useGenkitClient();
  const client = options.client ?? contextClient;
  const [data, setData] = useState<Output<A> | undefined>(undefined);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const controllerRef = useRef<AbortController | undefined>(undefined);
  const callIdRef = useRef(0);

  const abort = useCallback(() => {
    callIdRef.current += 1;
    controllerRef.current?.abort();
    controllerRef.current = undefined;
    setIsLoading(false);
  }, []);

  const reset = useCallback(() => {
    abort();
    setData(undefined);
    setError(undefined);
  }, [abort]);

  const execute = useCallback(
    async (input?: Input<A>) => {
      callIdRef.current += 1;
      const callId = callIdRef.current;
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;

      setIsLoading(true);
      setError(undefined);
      setData(undefined);

      try {
        const result = await client.runAction<A>({
          url: options.url,
          input,
          headers: options.headers,
          abortSignal: controller.signal,
        });
        if (callId === callIdRef.current) {
          setData(result);
          setIsLoading(false);
          controllerRef.current = undefined;
        }
        return result;
      } catch (err) {
        if (callId === callIdRef.current) {
          if (!isAbortError(err)) {
            setError(err instanceof Error ? err : new Error(String(err)));
          }
          setIsLoading(false);
          controllerRef.current = undefined;
        }
        throw err;
      }
    },
    [client, options.headers, options.url]
  );

  useEffect(() => abort, [abort]);

  return {
    execute,
    abort,
    reset,
    data,
    error,
    isLoading,
  };
}
