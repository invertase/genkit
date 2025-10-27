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

/**
 * Example script demonstrating checks plugin usage
 * Run with: npx tsx src/example.ts
 */

import { gemini15Flash, googleAI } from '@genkit-ai/googleai';
import { checks, checksMiddleware, ChecksEvaluationMetricType } from '@genkit-ai/checks';
import { genkit } from 'genkit';

// Simple example without full flow setup
async function demonstrateChecks() {
  console.log('🚀 Checks Plugin Demo');
  console.log('====================\n');

  // Initialize Genkit with checks plugin
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

  // Example 1: Safe content generation
  console.log('1. Generating safe content...');
  try {
    const safeResponse = await ai.generate({
      model: gemini15Flash,
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
    console.log('✅ Safe content generated:', safeResponse.text);
  } catch (error) {
    console.log('❌ Safe content blocked:', (error as Error).message);
  }

  console.log('\n2. Testing potentially unsafe content...');
  try {
    const unsafeResponse = await ai.generate({
      model: gemini15Flash,
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
    console.log('✅ Unsafe content generated:', unsafeResponse.text);
  } catch (error) {
    console.log('❌ Unsafe content blocked:', (error as Error).message);
  }

  console.log('\n3. Testing with custom thresholds...');
  try {
    const strictResponse = await ai.generate({
      model: gemini15Flash,
      prompt: 'Write about a conflict or disagreement',
      use: [
        checksMiddleware({
          authOptions: {
            projectId: process.env.GCLOUD_PROJECT || 'your-project-id',
          },
          metrics: [
            {
              type: ChecksEvaluationMetricType.HARASSMENT,
              threshold: 0.1, // Very strict threshold
            },
          ],
        }),
      ],
    });
    console.log('✅ Strict content generated:', strictResponse.text);
  } catch (error) {
    console.log('❌ Strict content blocked:', (error as Error).message);
  }

  console.log('\n✨ Demo completed!');
  console.log('\nTo run the full test app:');
  console.log('1. genkit ui:start');
  console.log('2. genkit start -- tsx --watch src/index.ts');
  console.log('3. Open localhost:4000 and test the flows');
}

// Run the demo if this file is executed directly
if (require.main === module) {
  demonstrateChecks().catch(console.error);
}

export { demonstrateChecks };
