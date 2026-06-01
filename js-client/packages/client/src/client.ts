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

import { Channel, createTask } from '@genkit-ai/core/async';
import type { Action } from 'genkit';
import { parseResponse } from './protocol/parse-response.js';
import { parseStreamResponse } from './protocol/parse-stream.js';
import {
  CallableTransport,
  type CallableTransportOptions,
} from './transport/callable-transport.js';
import type { Transport } from './transport/types.js';
import type { Input, Output, StreamChunk } from './types/action.js';

export interface GenkitClientOptions extends CallableTransportOptions {
  transport?: Transport;
}

export interface RunActionRequest<TInput = unknown> {
  /** Action endpoint path or full URL, e.g. `/api/menuSuggestion`. */
  url: string;
  /** Action input. */
  input?: TInput;
  /** Per-call headers merged after client-level headers. */
  headers?: HeadersInit;
  /** Abort signal to cancel the request. */
  abortSignal?: AbortSignal;
}

export interface StreamActionRequest<TInput = unknown>
  extends RunActionRequest<TInput> {
  /** Durable stream ID to reconnect to. */
  streamId?: string;
}

export interface StreamActionResult<TOutput = unknown, TChunk = unknown> {
  readonly output: Promise<TOutput>;
  readonly stream: AsyncIterable<TChunk>;
  readonly streamId: Promise<string | null>;
}

export interface GenkitClient {
  readonly transport: Transport;
  runAction<A extends Action = Action>(
    req: RunActionRequest<Input<A>>
  ): Promise<Output<A>>;
  streamAction<A extends Action = Action>(
    req: StreamActionRequest<Input<A>>
  ): StreamActionResult<Output<A>, StreamChunk<A>>;
}

export function createGenkitClient(
  options: GenkitClientOptions = {}
): GenkitClient {
  const transport =
    options.transport ??
    new CallableTransport({
      baseUrl: options.baseUrl,
      fetch: options.fetch,
      headers: options.headers,
    });

  return {
    transport,
    runAction: (req) => runActionWithTransport(transport, req),
    streamAction: (req) => streamActionWithTransport(transport, req),
  };
}

export function runAction<A extends Action = Action>(
  req: RunActionRequest<Input<A>>
): Promise<Output<A>> {
  return createGenkitClient().runAction(req);
}

export function streamAction<A extends Action = Action>(
  req: StreamActionRequest<Input<A>>
): StreamActionResult<Output<A>, StreamChunk<A>> {
  return createGenkitClient().streamAction(req);
}

async function runActionWithTransport<A extends Action = Action>(
  transport: Transport,
  req: RunActionRequest<Input<A>>
): Promise<Output<A>> {
  const response = await transport.request({
    url: req.url,
    input: req.input,
    headers: req.headers,
    abortSignal: req.abortSignal,
  });
  return await parseResponse<Output<A>>(response);
}

function streamActionWithTransport<A extends Action = Action>(
  transport: Transport,
  req: StreamActionRequest<Input<A>>
): StreamActionResult<Output<A>, StreamChunk<A>> {
  const channel = new Channel<{ value: StreamChunk<A> }>();
  const streamIdTask = createTask<string | null>();

  const operationPromise = (async () => {
    let response: Response | undefined;
    try {
      response = await transport.request({
        url: req.url,
        input: req.input,
        stream: true,
        streamId: req.streamId,
        headers: req.headers,
        abortSignal: req.abortSignal,
      });
      streamIdTask.resolve(response.headers.get('x-genkit-stream-id'));
      return await parseStreamResponse<Output<A>, StreamChunk<A>>(
        response,
        (chunk) => channel.send({ value: chunk })
      );
    } catch (err) {
      if (!response) {
        streamIdTask.reject(err);
      }
      throw err;
    }
  })();

  operationPromise.then(
    () => channel.close(),
    (err) => channel.error(err)
  );

  return {
    output: operationPromise,
    stream: unwrapChannel(channel),
    streamId: streamIdTask.promise,
  };
}

async function* unwrapChannel<T>(
  channel: AsyncIterable<{ value: T }>
): AsyncIterable<T> {
  for await (const item of channel) {
    yield item.value;
  }
}
