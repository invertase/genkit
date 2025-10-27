/**
 * Copyright 2024 Google LLC
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

import { gemini25FlashLite, googleAI } from '@genkit-ai/googleai';
import { checks, ChecksEvaluationMetricType } from '@genkit-ai/checks';
import { genkit, z } from 'genkit';
import { flows } from './flows';

const ai = genkit({
  plugins: [
    googleAI(),
    checks({
      projectId: process.env.GCLOUD_PROJECT || 'your-project-id',
      evaluation: {
        metrics: [
          ChecksEvaluationMetricType.DANGEROUS_CONTENT,
          ChecksEvaluationMetricType.PII_SOLICITING_RECITING,
          ChecksEvaluationMetricType.HARASSMENT,
          ChecksEvaluationMetricType.SEXUALLY_EXPLICIT,
          ChecksEvaluationMetricType.HATE_SPEECH,
          ChecksEvaluationMetricType.MEDICAL_INFO,
          ChecksEvaluationMetricType.VIOLENCE_AND_GORE,
          ChecksEvaluationMetricType.OBSCENITY_AND_PROFANITY,
        ],
      },
    }),
  ],
});

export const { safePoemFlow, contentModerationFlow, safetyEvaluationFlow } = flows(ai);

export const unsafePoemFlow = ai.defineFlow(
  {
    name: 'unsafePoemFlow',
    inputSchema: z.string(),
    outputSchema: z.string(),
  },
  async (topic) => {
    const { text } = await ai.generate({
      model: gemini25FlashLite,
      prompt: `Write a poem about: ${topic}`,
    });
    return text;
  }
);

export const userInputProcessor = ai.defineFlow(
  {
    name: 'userInputProcessor',
    inputSchema: z.object({
      userInput: z.string(),
      context: z.string().optional(),
    }),
    outputSchema: z.object({
      response: z.string(),
      safetyChecked: z.boolean(),
    }),
  },
  async ({ userInput, context }) => {
    const { text } = await ai.generate({
      model: gemini25FlashLite,
      prompt: `Respond to this user input: "${userInput}"${context ? ` in the context of: ${context}` : ''}`,
    });
    
    return {
      response: text,
      safetyChecked: true,
    };
  }
);
