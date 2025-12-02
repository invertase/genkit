/**
 * Copyright 2024 Bloom Labs Inc
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

import type Anthropic from '@anthropic-ai/sdk';
import { z } from 'genkit';
import { GenerationCommonConfigSchema } from 'genkit/model';

/**
 * Internal symbol for dependency injection in tests.
 * Not part of the public API.
 * @internal
 */
export const __testClient = Symbol('testClient');

/**
 * Plugin configuration options for the Anthropic plugin.
 */
export interface PluginOptions {
  apiKey?: string;
  cacheSystemPrompt?: boolean;
  /** Default API surface for all requests unless overridden per-request. */
  betaApis?: string[];
}

/**
 * Internal plugin options that include test client injection.
 * @internal
 */
export interface InternalPluginOptions extends PluginOptions {
  [__testClient]?: Anthropic;
}

/**
 * Shared parameters required to construct Claude helpers.
 */
interface ClaudeHelperParamsBase {
  name: string;
  client: Anthropic;
  cacheSystemPrompt?: boolean;
  defaultBetaApis?: string[];
}

/**
 * Parameters for creating a Claude model action.
 */
export interface ClaudeModelParams extends ClaudeHelperParamsBase {}

/**
 * Parameters for creating a Claude runner.
 */
export interface ClaudeRunnerParams extends ClaudeHelperParamsBase {}

export const AnthropicBetaApis = {
  // messageBatches: 'message-batches-2024-09-24',
  // promptCaching: 'prompt-caching-2024-07-31',
  // computerUse: 'computer-use-2025-01-24',
  pdfs: 'pdfs-2024-09-25',
  // tokenCounting: 'token-counting-2024-11-01',
  // tokenEfficientTools: 'token-efficient-tools-2025-02-19',
  // output128k: 'output-128k-2025-02-19',
  filesApi: 'files-api-2025-04-14',
  // mcpClient: 'mcp-client-2025-04-04',
  // devFullThinking: 'dev-full-thinking-2025-05-14',
  // interleavedThinking: 'interleaved-thinking-2025-05-14',
  // codeExecution: 'code-execution-2025-05-22',
  // extendedCacheTtl: 'extended-cache-ttl-2025-04-11',
  // context1m: 'context-1m-2025-08-07',
  // contextManagement: 'context-management-2025-06-27',
  // modelContextWindowExceeded: 'model-context-window-exceeded-2025-08-26',
  // skills: 'skills-2025-10-02',
  // effortParam: 'effort-param-2025-11-24',
  // advancedToolUse: 'advanced-tool-use-2025-11-20',
  // structuredOutputs: 'structured-outputs-2025-11-13',
} as const;

export const AnthropicBaseConfigSchema = GenerationCommonConfigSchema.extend({
  tool_choice: z
    .union([
      z.object({
        type: z.literal('auto'),
      }),
      z.object({
        type: z.literal('any'),
      }),
      z.object({
        type: z.literal('tool'),
        name: z.string(),
      }),
    ])
    .optional(),
  metadata: z
    .object({
      user_id: z.string().optional(),
    })
    .optional(),
  beta: z.object({
    enabled: z.boolean().optional(),
    // messageBatches: z.boolean().optional(),
    // promptCaching: z.boolean().optional(),
    // computerUse: z.boolean().optional(),
    pdfs: z.boolean().optional(),
    // tokenCounting: z.boolean().optional(),
    // tokenEfficientTools: z.boolean().optional(),
    // output128k: z.boolean().optional(),
    filesApi: z.boolean().optional(),
    // mcpClient: z.boolean().optional(),
    // devFullThinking: z.boolean().optional(),
    // interleavedThinking: z.boolean().optional(),
    // codeExecution: z.boolean().optional(),
    // extendedCacheTtl: z.boolean().optional(),
    // context1m: z.boolean().optional(),
    // contextManagement: z.boolean().optional(),
    // modelContextWindowExceeded: z.boolean().optional(),
    // skills: z.boolean().optional(),
    apis: z.array(z.string()).optional(),
  }).optional(),
});

export type AnthropicBaseConfigSchemaType = typeof AnthropicBaseConfigSchema;

export const ThinkingConfigSchema = z
  .object({
    enabled: z.boolean().optional(),
    budgetTokens: z.number().int().min(1_024).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.enabled && value.budgetTokens === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['budgetTokens'],
        message: 'budgetTokens is required when thinking is enabled',
      });
    }
  });

export const AnthropicThinkingConfigSchema = AnthropicBaseConfigSchema.extend({
  thinking: ThinkingConfigSchema.optional(),
});

export const AnthropicConfigSchema = AnthropicThinkingConfigSchema;

export type ThinkingConfig = z.infer<typeof ThinkingConfigSchema>;
export type AnthropicBaseConfig = z.infer<typeof AnthropicBaseConfigSchema>;
export type AnthropicThinkingConfig = z.infer<
  typeof AnthropicThinkingConfigSchema
>;
export type ClaudeConfig = AnthropicThinkingConfig | AnthropicBaseConfig;

/**
 * Media object representation with URL and optional content type.
 */
export interface Media {
  url: string;
  contentType?: string;
}

export const MediaSchema = z.object({
  url: z.string(),
  contentType: z.string().optional(),
});

export const MediaTypeSchema = z.enum([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]);

export type MediaType = z.infer<typeof MediaTypeSchema>;

export const MEDIA_TYPES = {
  JPEG: 'image/jpeg',
  PNG: 'image/png',
  GIF: 'image/gif',
  WEBP: 'image/webp',
} as const satisfies Record<string, MediaType>;

/**
 * Resolve whether beta API should be used for this call.
 * Priority:
 *   1. request.config.apiVersion (per-request override - explicit stable or beta)
 *   2. pluginDefaultApiVersion (plugin-wide default)
 *   3. otherwise stable
 */
export function resolveBetaEnabled(
  cfg: AnthropicThinkingConfig | AnthropicBaseConfig | undefined,
  pluginDefaultBetaApis?: string[]
): boolean {
  return true;
  // if (cfg?.beta !== undefined) {
  //   return cfg.beta.enabled ?? false;
  // }

  // return (pluginDefaultBetaApis?.length ?? 0) > 0;
}