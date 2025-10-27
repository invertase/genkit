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

import {
  ChecksEvaluationMetricType,
  checks,
  checksMiddleware,
} from '@genkit-ai/checks';
import { gemini25FlashLite, googleAI } from '@genkit-ai/googleai';
import { genkit } from 'genkit';

async function demonstrateChecks() {
  const ai = genkit({
    plugins: [
      googleAI(),
      checks({
        projectId: process.env.GCLOUD_PROJECT || 'your-project-id',
        evaluation: {
          metrics: [
            ChecksEvaluationMetricType.DANGEROUS_CONTENT,
            ChecksEvaluationMetricType.HARASSMENT,
            ChecksEvaluationMetricType.HATE_SPEECH,
          ],
        },
      }),
    ],
  });

  console.log('1. Generating safe content...');
  try {
    const safeResponse = await ai.generate({
      model: gemini25FlashLite,
      prompt: 'Write a friendly greeting message',
      use: [
        checksMiddleware({
          authOptions: {
            projectId: process.env.GCLOUD_PROJECT || 'your-project-id',
          },
          metrics: [ChecksEvaluationMetricType.HARASSMENT],
        }),
      ],
    });
  } catch (error) {
    console.log('Safe content blocked:', (error as Error).message);
  }

  try {
    const unsafeResponse = await ai.generate({
      model: gemini25FlashLite,
      prompt: 'Write something that might be considered harassment',
      use: [
        checksMiddleware({
          authOptions: {
            projectId: process.env.GCLOUD_PROJECT || 'your-project-id',
          },
          metrics: [ChecksEvaluationMetricType.HARASSMENT],
        }),
      ],
    });
  } catch (error) {
    console.log('Unsafe content blocked:', (error as Error).message);
  }

  try {
    const strictResponse = await ai.generate({
      model: gemini25FlashLite,
      prompt: 'Write about a conflict or disagreement',
      use: [
        checksMiddleware({
          authOptions: {
            projectId: process.env.GCLOUD_PROJECT || 'your-project-id',
          },
          metrics: [
            {
              type: ChecksEvaluationMetricType.HARASSMENT,
              threshold: 0.1,
            },
          ],
        }),
      ],
    });
  } catch (error) {
    console.log('Strict content blocked:', (error as Error).message);
  }
}

if (require.main === module) {
  demonstrateChecks().catch(console.error);
}

export { demonstrateChecks };
