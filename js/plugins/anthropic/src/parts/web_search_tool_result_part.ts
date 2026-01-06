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

import { WebSearchToolResultBlock } from '@anthropic-ai/sdk/resources';
import { Part } from 'genkit';
import {
  createAbility,
  SupportedPart,
  SupportedPartWhat,
  SupportedPartWhen,
} from './part';

const ID = 'web_search_tool_result';

export const WebSearchToolResultPart: SupportedPart = {
  abilities: [
    createAbility<WebSearchToolResultBlock>({
      id: [ID],
      when: [SupportedPartWhen.NonStream, SupportedPartWhen.StreamStart],
      what: [SupportedPartWhat.ContentBlock],
      func: (_when, _what, contentBlock) => {
        return toWebSearchToolResultPart({
          type: contentBlock.type,
          toolUseId: contentBlock.tool_use_id,
          content: contentBlock.content,
        });
      },
    }),
  ],
};

function toWebSearchToolResultPart(params: {
  toolUseId: string;
  content: unknown;
  type: string;
}): Part {
  const { toolUseId, content, type } = params;
  return {
    text: `[Anthropic server tool result ${toolUseId}] ${JSON.stringify(content)}`,
    custom: {
      anthropicServerToolResult: {
        type,
        toolUseId,
        content,
      },
    },
  };
}
