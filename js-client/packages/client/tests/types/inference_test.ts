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

import { genkit, z } from 'genkit';
import {
  runAction,
  streamAction,
  type Input,
  type Output,
  type StreamChunk,
} from '../../src/index.js';

const ai = genkit({});

const greetingFlow = ai.defineFlow(
  {
    name: 'greeting',
    inputSchema: z.object({ name: z.string() }),
    outputSchema: z.object({ greeting: z.string() }),
    streamSchema: z.string(),
  },
  async (input, { sendChunk }) => {
    sendChunk(input.name);
    return { greeting: `Hello, ${input.name}` };
  }
);

const validInput: Input<typeof greetingFlow> = { name: 'World' };
const validOutput: Output<typeof greetingFlow> = { greeting: 'Hello, World' };
const validChunk: StreamChunk<typeof greetingFlow> = 'World';

void validInput;
void validOutput;
void validChunk;

// @ts-expect-error input requires a name string
const invalidInput: Input<typeof greetingFlow> = { bad: 'World' };

// @ts-expect-error output requires a greeting string
const invalidOutput: Output<typeof greetingFlow> = { text: 'Hello' };

void invalidInput;
void invalidOutput;

const outputPromise: Promise<{ greeting: string }> = runAction<
  typeof greetingFlow
>({
  url: '/api/greeting',
  input: { name: 'World' },
});

void outputPromise;

// @ts-expect-error runAction input is inferred from the flow input schema
runAction<typeof greetingFlow>({
  url: '/api/greeting',
  input: { name: 123 },
});

const streaming = streamAction<typeof greetingFlow>({
  url: '/api/greeting',
  input: { name: 'World' },
});

const streamOutput: Promise<{ greeting: string }> = streaming.output;
const chunkStream: AsyncIterable<string> = streaming.stream;

void streamOutput;
void chunkStream;
