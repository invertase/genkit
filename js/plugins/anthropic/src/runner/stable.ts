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

import { MessageStream } from '@anthropic-ai/sdk/lib/MessageStream.js';
import type {
  DocumentBlockParam,
  ImageBlockParam,
  Message,
  MessageCreateParams,
  MessageCreateParamsNonStreaming,
  MessageCreateParamsStreaming,
  MessageParam,
  MessageStreamEvent,
  RedactedThinkingBlockParam,
  TextBlockParam,
  ThinkingBlockParam,
  Tool,
  ToolResultBlockParam,
  ToolUseBlockParam,
} from '@anthropic-ai/sdk/resources/messages';
import type {
  GenerateRequest,
  GenerateResponseData,
  ModelResponseData,
  Part,
} from 'genkit';

import { KNOWN_CLAUDE_MODELS, extractVersion } from '../models.js';
import { InputJsonPart } from '../parts/input_json_part.js';
import { RedactedThinkingPart } from '../parts/redacted_thinking_part.js';
import { ServerToolUsePart } from '../parts/server_tool_use_part.js';
import { TextPart } from '../parts/text_part.js';
import { ThinkingPart } from '../parts/thinking_part.js';
import { ToolUsePart } from '../parts/tool_use_part.js';
import { WebSearchToolResultPart } from '../parts/web_search_tool_result_part.js';
import { AnthropicConfigSchema, type ClaudeRunnerParams } from '../types.js';
import { BaseRunner } from './base.js';
import { RunnerTypes as BaseRunnerTypes } from './types.js';
interface RunnerTypes extends BaseRunnerTypes {
  Message: Message;
  Stream: MessageStream;
  StreamEvent: MessageStreamEvent;
  RequestBody: MessageCreateParamsNonStreaming;
  StreamingRequestBody: MessageCreateParamsStreaming;
  Tool: Tool;
  MessageParam: MessageParam;
  ToolResponseContent: TextBlockParam | ImageBlockParam;
  ContentBlockParam:
    | TextBlockParam
    | ImageBlockParam
    | DocumentBlockParam
    | ToolUseBlockParam
    | ToolResultBlockParam
    | ThinkingBlockParam
    | RedactedThinkingBlockParam;
}

export class Runner extends BaseRunner<RunnerTypes> {
  constructor(params: ClaudeRunnerParams) {
    super(params);
    this.supportedParts = [
      InputJsonPart,
      RedactedThinkingPart,
      ServerToolUsePart,
      TextPart,
      ThinkingPart,
      ToolUsePart,
      WebSearchToolResultPart,
    ];
  }

  protected toAnthropicMessageContent(
    part: Part
  ):
    | TextBlockParam
    | ImageBlockParam
    | DocumentBlockParam
    | ToolUseBlockParam
    | ToolResultBlockParam
    | ThinkingBlockParam
    | RedactedThinkingBlockParam {
    if (part.reasoning) {
      const signature = this.getThinkingSignature(part);
      if (!signature) {
        throw new Error(
          'Anthropic thinking parts require a signature when sending back to the API. Preserve the `custom.anthropicThinking.signature` value from the original response.'
        );
      }
      return {
        type: 'thinking',
        thinking: part.reasoning,
        signature,
      };
    }

    const redactedThinking = this.getRedactedThinkingData(part);
    if (redactedThinking !== undefined) {
      return {
        type: 'redacted_thinking',
        data: redactedThinking,
      };
    }

    if (part.text) {
      return {
        type: 'text',
        text: part.text,
        citations: null,
      };
    }

    if (part.media) {
      if (part.media.contentType === 'application/pdf') {
        return {
          type: 'document',
          source: this.toPdfDocumentSource(part.media),
        };
      }

      const source = this.toImageSource(part.media);
      if (source.kind === 'base64') {
        return {
          type: 'image',
          source: {
            type: 'base64',
            data: source.data,
            media_type: source.mediaType,
          },
        };
      }
      return {
        type: 'image',
        source: {
          type: 'url',
          url: source.url,
        },
      };
    }

    if (part.toolRequest) {
      if (!part.toolRequest.ref) {
        throw new Error(
          `Tool request ref is required for Anthropic API. Part: ${JSON.stringify(
            part.toolRequest
          )}`
        );
      }
      return {
        type: 'tool_use',
        id: part.toolRequest.ref,
        name: part.toolRequest.name,
        input: part.toolRequest.input,
      };
    }

    if (part.toolResponse) {
      if (!part.toolResponse.ref) {
        throw new Error(
          `Tool response ref is required for Anthropic API. Part: ${JSON.stringify(
            part.toolResponse
          )}`
        );
      }
      return {
        type: 'tool_result',
        tool_use_id: part.toolResponse.ref,
        content: [this.toAnthropicToolResponseContent(part)],
      };
    }

    throw new Error(
      `Unsupported genkit part fields encountered for current message role: ${JSON.stringify(
        part
      )}.`
    );
  }

  protected toAnthropicRequestBody(
    modelName: string,
    request: GenerateRequest<typeof AnthropicConfigSchema>,
    cacheSystemPrompt?: boolean
  ): MessageCreateParamsNonStreaming {
    const model = KNOWN_CLAUDE_MODELS[modelName];
    const { system, messages } = this.toAnthropicMessages(request.messages);
    const mappedModelName =
      request.config?.version ?? extractVersion(model, modelName);

    const systemValue =
      system === undefined
        ? undefined
        : cacheSystemPrompt
          ? [
              {
                type: 'text' as const,
                text: system,
                cache_control: { type: 'ephemeral' as const },
              },
            ]
          : system;

    const body: MessageCreateParamsNonStreaming = {
      model: mappedModelName,
      max_tokens:
        request.config?.maxOutputTokens ?? this.DEFAULT_MAX_OUTPUT_TOKENS,
      messages,
    };

    if (systemValue !== undefined) {
      body.system = systemValue;
    }

    if (request.tools) {
      const configTools = (request.config?.tools as Tool[]) ?? [];
      body.tools = [
        ...configTools,
        ...request.tools.map((tool) => this.toAnthropicTool(tool)),
      ];
    }
    if (request.config?.topK !== undefined) {
      body.top_k = request.config.topK;
    }
    if (request.config?.topP !== undefined) {
      body.top_p = request.config.topP;
    }
    if (request.config?.temperature !== undefined) {
      body.temperature = request.config.temperature;
    }
    if (request.config?.stopSequences !== undefined) {
      body.stop_sequences = request.config.stopSequences;
    }
    if (request.config?.metadata !== undefined) {
      body.metadata = request.config.metadata;
    }
    if (request.config?.tool_choice !== undefined) {
      body.tool_choice = request.config.tool_choice;
    }
    const thinkingConfig = this.toAnthropicThinkingConfig(
      request.config?.thinking
    );
    if (thinkingConfig) {
      body.thinking = thinkingConfig as MessageCreateParams['thinking'];
    }

    if (request.output?.format && request.output.format !== 'text') {
      throw new Error(
        `Only text output format is supported for Claude models currently`
      );
    }
    return body;
  }

  protected toAnthropicStreamingRequestBody(
    modelName: string,
    request: GenerateRequest<typeof AnthropicConfigSchema>,
    cacheSystemPrompt?: boolean
  ): MessageCreateParamsStreaming {
    const model = KNOWN_CLAUDE_MODELS[modelName];
    const { system, messages } = this.toAnthropicMessages(request.messages);
    const mappedModelName =
      request.config?.version ?? extractVersion(model, modelName);

    const systemValue =
      system === undefined
        ? undefined
        : cacheSystemPrompt
          ? [
              {
                type: 'text' as const,
                text: system,
                cache_control: { type: 'ephemeral' as const },
              },
            ]
          : system;

    const body: MessageCreateParamsStreaming = {
      model: mappedModelName,
      max_tokens:
        request.config?.maxOutputTokens ?? this.DEFAULT_MAX_OUTPUT_TOKENS,
      messages,
      stream: true,
    };

    if (systemValue !== undefined) {
      body.system = systemValue;
    }

    if (request.tools) {
      const configTools = (request.config?.tools as Tool[]) ?? [];
      body.tools = [
        ...configTools,
        ...request.tools.map((tool) => this.toAnthropicTool(tool)),
      ];
    }
    if (request.config?.topK !== undefined) {
      body.top_k = request.config.topK;
    }
    if (request.config?.topP !== undefined) {
      body.top_p = request.config.topP;
    }
    if (request.config?.temperature !== undefined) {
      body.temperature = request.config.temperature;
    }
    if (request.config?.stopSequences !== undefined) {
      body.stop_sequences = request.config.stopSequences;
    }
    if (request.config?.metadata !== undefined) {
      body.metadata = request.config.metadata;
    }
    if (request.config?.tool_choice !== undefined) {
      body.tool_choice = request.config.tool_choice;
    }
    const thinkingConfig = this.toAnthropicThinkingConfig(
      request.config?.thinking
    );
    if (thinkingConfig) {
      body.thinking =
        thinkingConfig as MessageCreateParamsStreaming['thinking'];
    }

    if (request.output?.format && request.output.format !== 'text') {
      throw new Error(
        `Only text output format is supported for Claude models currently`
      );
    }
    return body;
  }

  protected async createMessage(
    body: MessageCreateParamsNonStreaming,
    abortSignal: AbortSignal
  ): Promise<Message> {
    return await this.client.messages.create(body, { signal: abortSignal });
  }

  protected streamMessages(
    body: MessageCreateParamsStreaming,
    abortSignal: AbortSignal
  ): MessageStream {
    return this.client.messages.stream(body, { signal: abortSignal });
  }

  protected toGenkitResponse(message: Message): GenerateResponseData {
    return this.fromAnthropicResponse(message);
  }

  protected toGenkitPart(event: MessageStreamEvent): Part | undefined {
    return this.fromAnthropicContentBlockChunk(event);
  }

  protected fromAnthropicStopReason(
    reason: Message['stop_reason']
  ): ModelResponseData['finishReason'] {
    switch (reason) {
      case 'max_tokens':
        return 'length';
      case 'end_turn':
      // fall through
      case 'stop_sequence':
      // fall through
      case 'tool_use':
        return 'stop';
      case null:
        return 'unknown';
      default:
        return 'other';
    }
  }

  protected fromAnthropicResponse(response: Message): GenerateResponseData {
    return {
      candidates: [
        {
          index: 0,
          finishReason: this.fromAnthropicStopReason(response.stop_reason),
          message: {
            role: 'model',
            content: response.content.map((block) =>
              this.fromAnthropicContentBlock(block)
            ),
          },
        },
      ],
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
      custom: response,
    };
  }
}
