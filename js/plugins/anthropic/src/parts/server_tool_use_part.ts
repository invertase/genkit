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

import { ServerToolUseBlock } from '@anthropic-ai/sdk/resources';
import {
  createAbility,
  SupportedPart,
  SupportedPartWhat,
  SupportedPartWhen,
} from './part';

const ID = 'server_tool_use';

export const ServerToolUsePart: SupportedPart = {
  abilities: [
    createAbility<ServerToolUseBlock>({
      id: [ID],
      when: [SupportedPartWhen.NonStream, SupportedPartWhen.StreamStart],
      what: [SupportedPartWhat.ContentBlock],
      func: (_when, _what, contentBlock) => {
        const baseName = contentBlock.name ?? 'unknown_tool';
        const serverToolName =
          'server_name' in contentBlock && contentBlock.server_name
            ? `${contentBlock.server_name}/${baseName}`
            : baseName;

        return {
          text: `[Anthropic server tool ${serverToolName}] input: ${JSON.stringify(contentBlock.input)}`,
          custom: {
            anthropicServerToolUse: {
              id: contentBlock.id,
              name: serverToolName,
              input: contentBlock.input,
            },
          },
        };
      },
    }),
  ],
};
