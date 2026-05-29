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
  extractWireError,
  GenkitClientError,
  isHttpErrorWireFormat,
} from '../errors.js';

export interface CallableSuccessEnvelope<TOutput> {
  result: TOutput;
}

export interface CallableErrorEnvelope {
  error: unknown;
}

export type CallableEnvelope<TOutput> =
  | CallableSuccessEnvelope<TOutput>
  | CallableErrorEnvelope;

export async function parseResponse<TOutput>(
  response: Response
): Promise<TOutput> {
  if (response.status !== 200) {
    throw GenkitClientError.fromResponse(response, await response.text());
  }

  const wrappedResult = (await response.json()) as CallableEnvelope<TOutput>;
  if ('result' in wrappedResult) {
    return wrappedResult.result;
  }

  if ('error' in wrappedResult) {
    const error = wrappedResult.error;
    if (typeof error === 'string') {
      throw GenkitClientError.fromString(error, response);
    }
    if (isHttpErrorWireFormat(error)) {
      throw GenkitClientError.fromWire(error, response);
    }
    throw new GenkitClientError({
      status: 'UNKNOWN',
      message: JSON.stringify(error),
      httpStatus: response.status,
      traceId: response.headers.get('x-genkit-trace-id') ?? undefined,
    });
  }

  const wire = extractWireError(wrappedResult);
  if (wire) {
    throw GenkitClientError.fromWire(wire, response);
  }

  throw new GenkitClientError({
    status: 'UNKNOWN',
    message: `Unknown callable response format: ${JSON.stringify(
      wrappedResult
    )}`,
    httpStatus: response.status,
    traceId: response.headers.get('x-genkit-trace-id') ?? undefined,
  });
}

