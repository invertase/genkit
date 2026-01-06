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
  SupportedPart,
  SupportedPartWhat,
  SupportedPartWhen,
  throwErrorWrongTypeForAbility,
} from './part';

const ID = 'redacted_thinking';

export const RedactedThinkingPart: SupportedPart = {
  abilities: [
    {
      id: [ID],
      when: [SupportedPartWhen.NonStream, SupportedPartWhen.StreamStart],
      what: [SupportedPartWhat.ContentBlock],
      func: (when, what, contentBlock) => {
        if (contentBlock.type !== ID) {
          throwErrorWrongTypeForAbility(ID, when, what);
        }

        return { custom: { redactedThinking: contentBlock.data } };
      },
    },
  ],
};
