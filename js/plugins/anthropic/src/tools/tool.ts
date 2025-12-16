import { ContentBlock } from "@anthropic-ai/sdk/resources";
import { BetaContentBlock, BetaRawMessageStreamEvent } from "@anthropic-ai/sdk/resources/beta.js";
import { MessageStreamEvent } from "@anthropic-ai/sdk/resources/messages.js";

export interface Tool {
  abilities: Ability[];
}

export interface Ability {
  id: string;
  when: typeof ToolWhen;
  what: typeof ToolWhat;
  function: (chunk: MessageStreamEvent | BetaRawMessageStreamEvent | ContentBlock | BetaContentBlock) => any;
}

export const ToolWhen = {
  StreamDelta: 'stream_delta',
  StreamStart: 'stream_start',
  NonStream: 'non_stream',
} as const;

export const ToolWhat = {
  ContentBlock: 'content_block',
  ServerToolUse: 'server_tool_use',
} as const;
