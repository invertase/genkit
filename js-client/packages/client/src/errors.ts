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

import type { StatusName } from '@genkit-ai/core';

export interface HttpErrorWireFormat {
  details?: unknown;
  message: string;
  status: StatusName;
}

const statusNames = new Set<StatusName>([
  'OK',
  'CANCELLED',
  'UNKNOWN',
  'INVALID_ARGUMENT',
  'DEADLINE_EXCEEDED',
  'NOT_FOUND',
  'ALREADY_EXISTS',
  'PERMISSION_DENIED',
  'UNAUTHENTICATED',
  'RESOURCE_EXHAUSTED',
  'FAILED_PRECONDITION',
  'ABORTED',
  'OUT_OF_RANGE',
  'UNIMPLEMENTED',
  'INTERNAL',
  'UNAVAILABLE',
  'DATA_LOSS',
]);

const httpStatusToStatusName: Record<number, StatusName> = {
  400: 'INVALID_ARGUMENT',
  401: 'UNAUTHENTICATED',
  403: 'PERMISSION_DENIED',
  404: 'NOT_FOUND',
  409: 'ABORTED',
  429: 'RESOURCE_EXHAUSTED',
  499: 'CANCELLED',
  500: 'INTERNAL',
  501: 'UNIMPLEMENTED',
  503: 'UNAVAILABLE',
  504: 'DEADLINE_EXCEEDED',
};

export interface GenkitClientErrorOptions {
  status: StatusName;
  message: string;
  details?: unknown;
  httpStatus?: number;
  traceId?: string;
  cause?: unknown;
}

/**
 * Structured client-side representation of callable protocol failures.
 */
export class GenkitClientError extends Error {
  readonly status: StatusName;
  readonly details?: unknown;
  readonly httpStatus?: number;
  readonly traceId?: string;

  constructor(options: GenkitClientErrorOptions) {
    super(`${options.status}: ${options.message}`, {
      cause: options.cause,
    });
    this.name = 'GenkitClientError';
    this.status = options.status;
    this.details = options.details;
    this.httpStatus = options.httpStatus;
    this.traceId = options.traceId;
  }

  static fromWire(
    error: HttpErrorWireFormat,
    response?: Response
  ): GenkitClientError {
    return new GenkitClientError({
      status: normalizeStatusName(error.status),
      message: error.message,
      details: error.details,
      httpStatus: response?.status,
      traceId: traceIdFromResponse(response),
    });
  }

  static fromString(error: string, response?: Response): GenkitClientError {
    return new GenkitClientError({
      status: statusNameFromHttpStatus(response?.status),
      message: error,
      httpStatus: response?.status,
      traceId: traceIdFromResponse(response),
    });
  }

  static fromResponse(response: Response, body: string): GenkitClientError {
    const parsed = parseJson(body);
    const wire = extractWireError(parsed);
    if (wire) {
      return GenkitClientError.fromWire(wire, response);
    }

    const message =
      body.trim().length > 0
        ? `Server returned ${response.status}: ${body}`
        : `Server returned ${response.status}`;

    return new GenkitClientError({
      status: statusNameFromHttpStatus(response.status),
      message,
      httpStatus: response.status,
      traceId: traceIdFromResponse(response),
    });
  }
}

export function isHttpErrorWireFormat(
  value: unknown
): value is HttpErrorWireFormat {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Partial<HttpErrorWireFormat>;
  return (
    typeof candidate.message === 'string' &&
    typeof candidate.status === 'string' &&
    statusNames.has(candidate.status as StatusName)
  );
}

export function extractWireError(
  value: unknown
): HttpErrorWireFormat | undefined {
  if (isHttpErrorWireFormat(value)) {
    return value;
  }
  if (!value || typeof value !== 'object' || !('error' in value)) {
    return undefined;
  }
  const error = (value as { error: unknown }).error;
  return isHttpErrorWireFormat(error) ? error : undefined;
}

export function statusNameFromHttpStatus(status?: number): StatusName {
  if (status === undefined) {
    return 'UNKNOWN';
  }
  return httpStatusToStatusName[status] ?? 'UNKNOWN';
}

function normalizeStatusName(status: StatusName | string): StatusName {
  return statusNames.has(status as StatusName)
    ? (status as StatusName)
    : 'UNKNOWN';
}

function traceIdFromResponse(response?: Response): string | undefined {
  return response?.headers.get('x-genkit-trace-id') ?? undefined;
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}
