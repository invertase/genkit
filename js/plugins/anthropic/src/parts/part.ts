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
  ContentBlock,
  RawContentBlockDelta,
} from '@anthropic-ai/sdk/resources';
import {
  BetaContentBlock,
  BetaRawContentBlockDelta,
  BetaRawMessageStreamEvent,
} from '@anthropic-ai/sdk/resources/beta.js';
import { MessageStreamEvent } from '@anthropic-ai/sdk/resources/messages.js';
import type { Part } from 'genkit';

export interface SupportedPart {
  abilities: Ability[];
}

export interface Ability {
  id: string[];
  when: (typeof SupportedPartWhen)[keyof typeof SupportedPartWhen][];
  what: (typeof SupportedPartWhat)[keyof typeof SupportedPartWhat][];
  func: (
    when: (typeof SupportedPartWhen)[keyof typeof SupportedPartWhen],
    what: (typeof SupportedPartWhat)[keyof typeof SupportedPartWhat],
    chunk:
      | MessageStreamEvent
      | BetaRawMessageStreamEvent
      | ContentBlock
      | BetaContentBlock
      | RawContentBlockDelta
      | BetaRawContentBlockDelta
  ) => Part;
}

export const SupportedPartWhen = {
  StreamStart: 'stream_start' as const,
  StreamDelta: 'stream_delta' as const,
  StreamEnd: 'stream_end' as const,
  NonStream: 'non_stream' as const,
};

export const SupportedPartWhat = {
  ContentBlock: 'content_block' as const,
};

export function throwErrorWrongTypeForAbility(
  partId: string,
  when: (typeof SupportedPartWhen)[keyof typeof SupportedPartWhen],
  what: (typeof SupportedPartWhat)[keyof typeof SupportedPartWhat]
): never {
  throw new Error(
    `Part '${partId}' is not supported for ${String(when)
      .replace(/([A-Z])/g, ' $1')
      .toLowerCase()} in ${what}`
  );
}

function validatePartType<T extends { type: string }>(
  expectedTypes: string | string[],
  chunk: unknown,
  when: (typeof SupportedPartWhen)[keyof typeof SupportedPartWhen],
  what: (typeof SupportedPartWhat)[keyof typeof SupportedPartWhat]
): asserts chunk is T {
  const types = Array.isArray(expectedTypes) ? expectedTypes : [expectedTypes];
  const chunkWithType = chunk as { type: string };
  if (!types.includes(chunkWithType.type)) {
    throwErrorWrongTypeForAbility(types[0], when, what);
  }
}

export function createAbility<T extends { type: string }>(config: {
  id: string[];
  when: (typeof SupportedPartWhen)[keyof typeof SupportedPartWhen][];
  what: (typeof SupportedPartWhat)[keyof typeof SupportedPartWhat][];
  func: (
    when: (typeof SupportedPartWhen)[keyof typeof SupportedPartWhen],
    what: (typeof SupportedPartWhat)[keyof typeof SupportedPartWhat],
    chunk: T
  ) => Part;
}): Ability {
  return {
    id: config.id,
    when: config.when,
    what: config.what,
    func: (when, what, chunk) => {
      validatePartType<T>(config.id, chunk, when, what);
      return config.func(when, what, chunk);
    },
  };
}
