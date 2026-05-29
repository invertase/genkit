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

import type { Transport, TransportRequest } from './types.js';

export type HeaderProvider =
  | HeadersInit
  | (() => HeadersInit | Promise<HeadersInit>);

export interface CallableTransportOptions {
  baseUrl?: string;
  fetch?: typeof fetch;
  headers?: HeaderProvider;
}

export class CallableTransport implements Transport {
  private readonly baseUrl?: string;
  private readonly fetchImpl: typeof fetch;
  private readonly headers?: HeaderProvider;

  constructor(options: CallableTransportOptions = {}) {
    this.baseUrl = options.baseUrl;
    this.fetchImpl = options.fetch ?? globalThis.fetch?.bind(globalThis);
    this.headers = options.headers;

    if (!this.fetchImpl) {
      throw new Error(
        'No fetch implementation available. Pass fetch to CallableTransport.'
      );
    }
  }

  async request(options: TransportRequest): Promise<Response> {
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    if (options.stream) {
      headers.set('Accept', 'text/event-stream');
    }
    mergeHeaders(headers, await resolveHeaders(this.headers));
    mergeHeaders(headers, options.headers);
    if (options.streamId) {
      headers.set('x-genkit-stream-id', options.streamId);
    }

    return await this.fetchImpl(resolveUrl(options.url, this.baseUrl), {
      method: 'POST',
      body: JSON.stringify({ data: options.input }),
      headers,
      signal: options.abortSignal,
    });
  }
}

export function resolveUrl(url: string, baseUrl?: string): string {
  if (!baseUrl || isAbsoluteUrl(url)) {
    return url;
  }

  const normalizedBase = baseUrl.endsWith('/')
    ? baseUrl.substring(0, baseUrl.length - 1)
    : baseUrl;
  const normalizedPath = url.startsWith('/') ? url : `/${url}`;
  return `${normalizedBase}${normalizedPath}`;
}

async function resolveHeaders(
  headers?: HeaderProvider
): Promise<HeadersInit | undefined> {
  if (!headers) {
    return undefined;
  }
  return typeof headers === 'function' ? await headers() : headers;
}

function mergeHeaders(target: Headers, source?: HeadersInit): void {
  if (!source) {
    return;
  }
  new Headers(source).forEach((value, key) => target.set(key, value));
}

function isAbsoluteUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

