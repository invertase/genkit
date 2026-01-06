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

import { ThinkingBlock, ThinkingDelta } from '@anthropic-ai/sdk/resources';
import { Part } from 'genkit';
import { ANTHROPIC_THINKING_CUSTOM_KEY } from '../runner/base';
import {
  SupportedPart,
  SupportedPartWhat,
  SupportedPartWhen,
  createAbility,
} from './part';

const ID = 'thinking';
const ID_DELTA = 'thinking_delta';

export const ThinkingPart: SupportedPart = {
  abilities: [
    createAbility<ThinkingBlock>({
      id: [ID],
      when: [SupportedPartWhen.NonStream, SupportedPartWhen.StreamStart],
      what: [SupportedPartWhat.ContentBlock],
      func: (_when, _what, contentBlock) => {
        return createThinkingPart(
          contentBlock.thinking,
          contentBlock.signature
        );
      },
    }),

    createAbility<ThinkingDelta>({
      id: [ID_DELTA],
      when: [SupportedPartWhen.StreamDelta],
      what: [SupportedPartWhat.ContentBlock],
      func: (_when, _what, delta) => {
        return { reasoning: delta.thinking };
      },
    }),
  ],
};

function createThinkingPart(thinking: string, signature?: string): Part {
  const custom =
    signature !== undefined
      ? {
          [ANTHROPIC_THINKING_CUSTOM_KEY]: { signature },
        }
      : undefined;
  return custom
    ? {
        reasoning: thinking,
        custom,
      }
    : {
        reasoning: thinking,
      };
}
