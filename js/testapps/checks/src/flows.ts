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

import { gemini25FlashLite } from '@genkit-ai/googleai';
import { checksMiddleware, ChecksEvaluationMetricType } from '@genkit-ai/checks';
import { z } from 'genkit';
import type { Genkit } from 'genkit';

export function flows(ai: Genkit) {
  // Flow with comprehensive safety checks using middleware
  const safePoemFlow = ai.defineFlow(
    {
      name: 'safePoemFlow',
      inputSchema: z.string(),
      outputSchema: z.string(),
    },
    async (topic) => {
      const { text } = await ai.generate({
        model: gemini25FlashLite,
        prompt: `Write a creative poem about: ${topic}. Make it engaging and appropriate for all audiences.`,
        use: [
          checksMiddleware({
            authOptions: {
              projectId: process.env.GCLOUD_PROJECT || 'your-project-id',
            },
            metrics: [
              ChecksEvaluationMetricType.DANGEROUS_CONTENT,
              ChecksEvaluationMetricType.HARASSMENT,
              ChecksEvaluationMetricType.HATE_SPEECH,
              ChecksEvaluationMetricType.OBSCENITY_AND_PROFANITY,
              {
                type: ChecksEvaluationMetricType.SEXUALLY_EXPLICIT,
                threshold: 0.3, 
              },
              {
                type: ChecksEvaluationMetricType.VIOLENCE_AND_GORE,
                threshold: 0.2,  
              },
            ],
          }),
        ],
      });
      return text;
    }
  );

  const contentModerationFlow = ai.defineFlow(
    {
      name: 'contentModerationFlow',
      inputSchema: z.object({
        content: z.string(),
        strictMode: z.boolean().optional(),
      }),
      outputSchema: z.object({
        moderatedContent: z.string(),
        violations: z.array(z.string()).optional(),
        blocked: z.boolean(),
      }),
    },
    async ({ content, strictMode = false }) => {
      try {
        const { text } = await ai.generate({
          model: gemini25FlashLite,
          prompt: `Review and moderate this content, making it appropriate for general audiences: "${content}"`,
          use: [
            checksMiddleware({
              authOptions: {
                projectId: process.env.GCLOUD_PROJECT || 'your-project-id',
              },
              metrics: [
                ChecksEvaluationMetricType.DANGEROUS_CONTENT,
                ChecksEvaluationMetricType.HARASSMENT,
                ChecksEvaluationMetricType.HATE_SPEECH,
                ChecksEvaluationMetricType.OBSCENITY_AND_PROFANITY,
                {
                  type: ChecksEvaluationMetricType.SEXUALLY_EXPLICIT,
                  threshold: strictMode ? 0.1 : 0.5,
                },
                {
                  type: ChecksEvaluationMetricType.VIOLENCE_AND_GORE,
                  threshold: strictMode ? 0.1 : 0.4,
                },
              ],
            }),
          ],
        });

        return {
          moderatedContent: text,
          blocked: false,
        };
      } catch (error: any) {
        if (error.message?.includes('violated Checks policies')) {
          const violations = error.message.match(/\[([^\]]+)\]/)?.[1]?.split(' ') || [];
          return {
            moderatedContent: '',
            violations,
            blocked: true,
          };
        }
        throw error;
      }
    }
  );

  const safetyEvaluationFlow = ai.defineFlow(
    {
      name: 'safetyEvaluationFlow',
      inputSchema: z.object({
        text: z.string(),
        policies: z.array(z.string()).optional(),
      }),
      outputSchema: z.object({
        result: z.string(),
        evaluation: z.any().optional(),
      }),
    },
    async ({ text, policies }) => {
      const selectedPolicies = policies || [
        ChecksEvaluationMetricType.DANGEROUS_CONTENT,
        ChecksEvaluationMetricType.HARASSMENT,
        ChecksEvaluationMetricType.HATE_SPEECH,
      ];

      const { text: result } = await ai.generate({
        model: gemini25FlashLite,
        prompt: `Analyze this text for safety: "${text}". Provide a brief analysis.`,
        use: [
          checksMiddleware({
            authOptions: {
              projectId: process.env.GCLOUD_PROJECT || 'your-project-id',
            },
            metrics: selectedPolicies.map(policy => ({
              type: policy as ChecksEvaluationMetricType,
              threshold: 0.5, // Default threshold
            })),
          }),
        ],
      });

      return {
        result,
      };
    }
  );

  return {
    safePoemFlow,
    contentModerationFlow,
    safetyEvaluationFlow,
  };
}
