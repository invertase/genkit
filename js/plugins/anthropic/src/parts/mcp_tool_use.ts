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

import { unsupportedBetaServerToolError } from '../utils';
import {
  SupportedPart,
  SupportedPartWhat,
  SupportedPartWhen,
  throwErrorWrongTypeForAbility,
} from './part';

const ID = 'mcp_tool_use';

export const McpToolUsePart: SupportedPart = {
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

        throw new Error(unsupportedBetaServerToolError(contentBlock.type));
      },
    },
  ],
};
