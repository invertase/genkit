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

import { Part } from 'genkit';
import { ANTHROPIC_THINKING_CUSTOM_KEY } from '../runner/base';
import {
  SupportedPart,
  SupportedPartWhat,
  SupportedPartWhen,
  throwErrorWrongTypeForAbility,
} from './part';

const ID = 'thinking';
const ID_DELTA = 'thinking_delta';

export const ThinkingPart: SupportedPart = {
  abilities: [
    {
      id: ID,
      when: SupportedPartWhen.NonStream,
      what: SupportedPartWhat.ContentBlock,
      func: (contentBlock) => {
        if (contentBlock.type !== ID) {
          throwErrorWrongTypeForAbility(
            ID,
            SupportedPartWhen.NonStream,
            SupportedPartWhat.ContentBlock
          );
        }

        return createThinkingPart(
          contentBlock.thinking,
          contentBlock.signature
        );
      },
    },

    {
      id: ID_DELTA,
      when: SupportedPartWhen.StreamDelta,
      what: SupportedPartWhat.ContentBlock,
      func: (delta) => {
        if (delta.type !== ID_DELTA) {
          throwErrorWrongTypeForAbility(
            ID_DELTA,
            SupportedPartWhen.StreamDelta,
            SupportedPartWhat.ContentBlock
          );
        }

        return { reasoning: delta.thinking };
      },
    },

    {
      id: ID,
      when: SupportedPartWhen.StreamStart,
      what: SupportedPartWhat.ContentBlock,
      func: (contentBlock) => {
        if (contentBlock.type !== ID) {
          throwErrorWrongTypeForAbility(
            ID,
            SupportedPartWhen.StreamStart,
            SupportedPartWhat.ContentBlock
          );
        }

        return createThinkingPart(
          contentBlock.thinking,
          contentBlock.signature
        );
      },
    },
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
