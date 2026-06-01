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

export type { Action } from 'genkit';
export { runFlow, streamFlow } from './aliases.js';
export {
  createGenkitClient,
  runAction,
  streamAction,
  type GenkitClient,
  type GenkitClientOptions,
  type RunActionRequest,
  type StreamActionRequest,
  type StreamActionResult,
} from './client.js';
export {
  GenkitClientError,
  extractWireError,
  isHttpErrorWireFormat,
  statusNameFromHttpStatus,
  type GenkitClientErrorOptions,
} from './errors.js';
export {
  parseResponse,
  type CallableEnvelope,
} from './protocol/parse-response.js';
export {
  parseStreamEvent,
  parseStreamResponse,
  type ParsedStreamEvent,
  type StreamEnvelope,
} from './protocol/parse-stream.js';
export {
  CallableTransport,
  resolveUrl,
  type CallableTransportOptions,
  type HeaderProvider,
} from './transport/callable-transport.js';
export type { Transport, TransportRequest } from './transport/types.js';
export type { Input, Output, StreamChunk } from './types/action.js';
