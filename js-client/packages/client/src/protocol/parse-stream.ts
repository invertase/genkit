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

import { GenkitClientError, isHttpErrorWireFormat } from '../errors.js';

const streamDelimiter = '\n\n';

export type StreamEnvelope<TOutput, TChunk> =
  | { message: TChunk }
  | { result: TOutput }
  | { error: unknown };

export type ParsedStreamEvent<TOutput, TChunk> =
  | { type: 'message'; message: TChunk }
  | { type: 'result'; result: TOutput }
  | { type: 'error'; error: unknown }
  | { type: 'done' };

export async function parseStreamResponse<TOutput, TChunk>(
  response: Response,
  sendChunk: (chunk: TChunk) => void
): Promise<TOutput> {
  if (response.status === 204) {
    throw new GenkitClientError({
      status: 'NOT_FOUND',
      message: 'Stream not found.',
      httpStatus: response.status,
    });
  }

  if (response.status !== 200) {
    throw GenkitClientError.fromResponse(response, await response.text());
  }

  if (!response.body) {
    throw new GenkitClientError({
      status: 'UNKNOWN',
      message: 'Response body is empty',
      httpStatus: response.status,
      traceId: response.headers.get('x-genkit-trace-id') ?? undefined,
    });
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  for (;;) {
    const result = await reader.read();
    buffer += result.done
      ? decoder.decode()
      : decoder.decode(result.value, { stream: true });

    let delimiterIndex = buffer.indexOf(streamDelimiter);
    while (delimiterIndex >= 0) {
      const rawEvent = buffer.substring(0, delimiterIndex);
      buffer = buffer.substring(delimiterIndex + streamDelimiter.length);
      const parsed = parseStreamEvent<TOutput, TChunk>(rawEvent);
      const maybeResult = handleParsedEvent(parsed, response, sendChunk);
      if (maybeResult.done) {
        return maybeResult.result;
      }
      delimiterIndex = buffer.indexOf(streamDelimiter);
    }

    if (result.done) {
      break;
    }
  }

  if (buffer.trim().length > 0) {
    const parsed = parseStreamEvent<TOutput, TChunk>(buffer);
    const maybeResult = handleParsedEvent(parsed, response, sendChunk);
    if (maybeResult.done) {
      return maybeResult.result;
    }
  }

  throw new GenkitClientError({
    status: 'UNKNOWN',
    message: 'Stream did not terminate correctly',
    httpStatus: response.status,
    traceId: response.headers.get('x-genkit-trace-id') ?? undefined,
  });
}

export function parseStreamEvent<TOutput, TChunk>(
  rawEvent: string
): ParsedStreamEvent<TOutput, TChunk> {
  const event = rawEvent.trim();
  if (!event) {
    return { type: 'done' };
  }

  const payload = extractPayload(event);
  if (payload === '[DONE]') {
    return { type: 'done' };
  }

  let chunk: StreamEnvelope<TOutput, TChunk>;
  try {
    chunk = JSON.parse(payload) as StreamEnvelope<TOutput, TChunk>;
  } catch (e) {
    throw new GenkitClientError({
      status: 'UNKNOWN',
      message: `Invalid stream event JSON: ${payload}`,
      cause: e,
    });
  }

  if ('message' in chunk) {
    return { type: 'message', message: chunk.message };
  }
  if ('result' in chunk) {
    return { type: 'result', result: chunk.result };
  }
  if ('error' in chunk) {
    return { type: 'error', error: chunk.error };
  }

  throw new GenkitClientError({
    status: 'UNKNOWN',
    message: `Unknown stream event format: ${JSON.stringify(chunk)}`,
  });
}

function handleParsedEvent<TOutput, TChunk>(
  parsed: ParsedStreamEvent<TOutput, TChunk>,
  response: Response,
  sendChunk: (chunk: TChunk) => void
): { done: true; result: TOutput } | { done: false } {
  switch (parsed.type) {
    case 'done':
      return { done: false };
    case 'message':
      sendChunk(parsed.message);
      return { done: false };
    case 'result':
      return { done: true, result: parsed.result };
    case 'error':
      if (typeof parsed.error === 'string') {
        throw GenkitClientError.fromString(parsed.error, response);
      }
      if (isHttpErrorWireFormat(parsed.error)) {
        throw GenkitClientError.fromWire(parsed.error, response);
      }
      throw new GenkitClientError({
        status: 'UNKNOWN',
        message: JSON.stringify(parsed.error),
        httpStatus: response.status,
        traceId: response.headers.get('x-genkit-trace-id') ?? undefined,
      });
  }
}

function extractPayload(event: string): string {
  const lines = event.split(/\r?\n/);
  const dataLines = lines
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.substring('data:'.length).trimStart());
  if (dataLines.length > 0) {
    return dataLines.join('\n');
  }

  const errorLine = lines.find((line) => line.startsWith('error:'));
  if (errorLine) {
    return errorLine.substring('error:'.length).trimStart();
  }

  if (event.startsWith('{')) {
    return event;
  }

  throw new GenkitClientError({
    status: 'UNKNOWN',
    message: `Unknown stream event format: ${event}`,
  });
}
