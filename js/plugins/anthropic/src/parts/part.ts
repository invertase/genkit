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

export interface SupportedPart {
  abilities: Ability[];
}

export interface Ability {
  id: string;
  when: (typeof SupportedPartWhen)[keyof typeof SupportedPartWhen];
  what: (typeof SupportedPartWhat)[keyof typeof SupportedPartWhat];
  func: (
    chunk:
      | MessageStreamEvent
      | BetaRawMessageStreamEvent
      | ContentBlock
      | BetaContentBlock
      | RawContentBlockDelta
      | BetaRawContentBlockDelta
  ) => any;
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
  chunk: (typeof SupportedPartWhen)[keyof typeof SupportedPartWhen],
  what: (typeof SupportedPartWhat)[keyof typeof SupportedPartWhat]
): never {
  switch (chunk) {
    case SupportedPartWhen.StreamStart:
      throw new Error(
        `Part '${partId}' is not supported for stream start in ${what}`
      );
    case SupportedPartWhen.StreamDelta:
      throw new Error(
        `Part '${partId}' is not supported for stream delta in ${what}`
      );
    case SupportedPartWhen.StreamEnd:
      throw new Error(
        `Part '${partId}' is not supported for stream end in ${what}`
      );
    case SupportedPartWhen.NonStream:
      throw new Error(
        `Part '${partId}' is not supported for non stream in ${what}`
      );
  }
}
