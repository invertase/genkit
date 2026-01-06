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

import { ToolUseBlock } from '@anthropic-ai/sdk/resources';
import {
  createAbility,
  SupportedPart,
  SupportedPartWhat,
  SupportedPartWhen,
} from './part';

const ID = 'tool_use';

export const ToolUsePart: SupportedPart = {
  abilities: [
    createAbility<ToolUseBlock>({
      id: [ID],
      when: [SupportedPartWhen.NonStream, SupportedPartWhen.StreamStart],
      what: [SupportedPartWhat.ContentBlock],
      func: (_when, _what, contentBlock) => {
        return {
          toolRequest: {
            ref: contentBlock.id,
            name: contentBlock.name ?? 'unknown_tool',
            input: contentBlock.input,
          },
        };
      },
    }),
  ],
};
