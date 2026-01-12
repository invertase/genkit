# Firebase Genkit + Anthropic AI

<h1 align="center">Firebase Genkit <> Anthropic AI Plugin</h1>

<h4 align="center">Anthropic AI plugin for Google Firebase Genkit</h4>

`@genkit-ai/anthropic` is the official Anthropic plugin for [Firebase Genkit](https://github.com/firebase/genkit). It supersedes the earlier community package `genkitx-anthropic` and is now maintained by Google.

## Supported models

The plugin supports the most recent Anthropic models: **Claude Haiku 4.5**, **Claude Sonnet 4.5**, and **Claude Opus 4.5**. Additionally, the plugin supports all of the [non-retired older models](https://platform.claude.com/docs/en/about-claude/model-deprecations#model-status).

## Installation

Install the plugin in your project with your favorite package manager:

- `npm install @genkit-ai/anthropic`
- `yarn add @genkit-ai/anthropic`
- `pnpm add @genkit-ai/anthropic`

## Configuration

The plugin accepts the following configuration options:

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `apiKey` | `string` | Yes* | Your Anthropic API key. Can also be set via `ANTHROPIC_API_KEY` environment variable |
| `cacheSystemPrompt` | `boolean` | No | Enable prompt caching to reduce costs and latency for repeated system prompts (default: `false`) |
| `apiVersion` | `'stable' \| 'beta'` | No | Default API surface for all requests. Can be overridden per-request (default: `'stable'`) |

*The API key is required but can be provided via the environment variable `ANTHROPIC_API_KEY` instead of the config option.

### Request-level configuration

In addition to plugin-level configuration, you can pass the following options in the `config` parameter of `generate()` or `generateStream()`:

| Option | Type | Description |
|--------|------|-------------|
| `apiVersion` | `'stable' \| 'beta'` | Override the API version for this specific request |
| `tool_choice` | `object` | Control which tools the model can use: `{ type: 'auto' }` (default), `{ type: 'any' }` (require any tool), or `{ type: 'tool', name: 'toolName' }` (force specific tool) |
| `thinking` | `object` | Enable extended thinking: `{ enabled: true, budgetTokens: 4096 }` |
| `metadata` | `object` | Request metadata, e.g., `{ user_id: 'user123' }` |

Plus all standard Genkit configuration options like `temperature`, `maxOutputTokens`, `topP`, `topK`, and `stopSequences`.

## Usage

### Initialize

```typescript
import { genkit } from 'genkit';
import { anthropic } from '@genkit-ai/anthropic';

const ai = genkit({
  plugins: [anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })],
  // specify a default model for generate here if you wish:
  model: anthropic.model('claude-sonnet-4-5'),
});
```

### Basic examples

The simplest way to generate text is by using the `generate` method:

```typescript
const response = await ai.generate({
  model: anthropic.model('claude-haiku-4-5'),
  prompt: 'Tell me a joke.',
});

console.log(response.text);
```

### Streaming responses

Use `generateStream` to receive responses incrementally:

```typescript
const { stream } = ai.generateStream({
  model: anthropic.model('claude-sonnet-4-5'),
  prompt: 'Write a short story about a robot.',
});

for await (const chunk of stream) {
  if (chunk.text) {
    process.stdout.write(chunk.text);
  }
}
```

### Multi-modal prompts

Claude supports analyzing images, PDFs, and other media types.

**Supported image formats:** JPEG, PNG, GIF, WEBP

**Supported document formats:** PDF (via base64 data URLs, public URLs, or Files API)

#### Image analysis

Analyze images from URLs or base64-encoded data:

```typescript
// From a URL
const response = await ai.generate({
  model: anthropic.model('claude-sonnet-4-5'),
  prompt: [
    { text: 'What animal is in the photo?' },
    { media: { url: 'https://example.com/image.jpg' } },
  ],
});

// From base64-encoded data
import * as fs from 'fs';

const imageBuffer = fs.readFileSync('image.png');
const imageBase64 = imageBuffer.toString('base64');

const response = await ai.generate({
  model: anthropic.model('claude-sonnet-4-5'),
  prompt: [
    { text: 'Describe this image in detail.' },
    {
      media: {
        url: `data:image/png;base64,${imageBase64}`,
        contentType: 'image/png',
      },
    },
  ],
});
```

#### Multi-turn conversations with images

Continue conversations about images across multiple turns:

```typescript
const response = await ai.generate({
  model: anthropic.model('claude-sonnet-4-5'),
  messages: [
    {
      role: 'user',
      content: [
        { text: 'What do you see in this image?' },
        { media: { url: imageUrl } },
      ],
    },
    {
      role: 'model',
      content: [{ text: 'I see a cat sitting on a windowsill.' }],
    },
    {
      role: 'user',
      content: [{ text: 'What color is the cat?' }],
    },
  ],
});
```

#### PDF document processing

Process PDF documents by providing them as base64 data URLs or public URLs:

```typescript
import * as fs from 'fs';
import * as path from 'path';

// Using base64 encoding
const pdfBuffer = fs.readFileSync('document.pdf');
const pdfBase64 = pdfBuffer.toString('base64');

const response = await ai.generate({
  model: anthropic.model('claude-sonnet-4-5'),
  messages: [
    {
      role: 'user',
      content: [
        { text: 'Summarize the key points from this document.' },
        {
          media: {
            url: `data:application/pdf;base64,${pdfBase64}`,
            contentType: 'application/pdf',
          },
        },
      ],
    },
  ],
});
```

Alternatively, use a publicly accessible URL:

```typescript
const response = await ai.generate({
  model: anthropic.model('claude-sonnet-4-5'),
  messages: [
    {
      role: 'user',
      content: [
        { text: 'What are the main findings in this research paper?' },
        {
          media: {
            url: 'https://example.com/paper.pdf',
            contentType: 'application/pdf',
          },
        },
      ],
    },
  ],
});
```

### Tool/function calling

Define tools that Claude can use to answer questions:

```typescript
import { z } from 'genkit';

const getWeather = ai.defineTool(
  {
    name: 'getWeather',
    description: 'Gets the current weather in a given location',
    inputSchema: z.object({
      location: z.string().describe('The location to get the weather for'),
    }),
    outputSchema: z.string(),
  },
  async (input) => {
    // Your implementation here
    return `The current weather in ${input.location} is 72°F and sunny.`;
  }
);

const response = await ai.generate({
  model: anthropic.model('claude-sonnet-4-5'),
  tools: [getWeather],
  prompt: 'What is the weather in San Francisco?',
});
```

You can control tool usage with the `tool_choice` config:

```typescript
const response = await ai.generate({
  model: anthropic.model('claude-sonnet-4-5'),
  tools: [getWeather],
  prompt: 'What is the weather in Paris?',
  config: {
    tool_choice: { type: 'tool', name: 'getWeather' }, // Force specific tool
    // or { type: 'any' } to require any tool
    // or { type: 'auto' } to let model decide (default)
  },
});
```

### Structured output

Generate JSON responses that conform to a specific schema using the `output` option:

```typescript
const response = await ai.generate({
  model: anthropic.model('claude-sonnet-4-5'),
  prompt: 'Generate a fictional person with a name, age, and city.',
  output: {
    schema: z.object({
      name: z.string(),
      age: z.number(),
      city: z.string(),
    }),
    format: 'json',
    constrained: true, // Ensures strict schema adherence (beta API)
  },
});

console.log(response.output); // Typed object matching the schema
```

### Extended thinking

Claude 4.5 models can expose their internal reasoning. Enable it per-request with the Anthropic thinking config and read the reasoning from the response:

```typescript
const response = await ai.generate({
  prompt: 'Walk me through your reasoning for Fermat’s little theorem.',
  config: {
    thinking: {
      enabled: true,
      budgetTokens: 4096, // Must be >= 1024 and less than max_tokens
    },
  },
});

console.log(response.text);       // Final assistant answer
console.log(response.reasoning);  // Summarized thinking steps
```

When thinking is enabled, request bodies sent through the plugin include the `thinking` payload (`{ type: 'enabled', budget_tokens: … }`) that Anthropic's API expects, and streamed responses deliver `reasoning` parts as they arrive so you can render the chain-of-thought incrementally.

### System prompt caching

Enable prompt caching to reduce costs and latency for repeated system prompts:

```typescript
const ai = genkit({
  plugins: [
    anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      cacheSystemPrompt: true, // Enable caching
    }),
  ],
});
```

When enabled, system prompts are automatically cached according to [Anthropic's prompt caching documentation](https://docs.anthropic.com/en/docs/prompt-caching).

### API version selection

The plugin supports both stable and beta API surfaces. Configure the default API version at the plugin level or override per-request:

```typescript
// Set default to beta for all requests
const ai = genkit({
  plugins: [
    anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      apiVersion: 'beta', // Default to beta API
    }),
  ],
});

// Override per-request
const response = await ai.generate({
  model: anthropic.model('claude-sonnet-4-5'),
  prompt: 'Hello',
  config: {
    apiVersion: 'stable', // Use stable API for this request
  },
});
```

You can also specify the API version when creating model references:

```typescript
const betaModel = anthropic.model('claude-opus-4-5', { apiVersion: 'beta' });
```

### Beta API features

The beta API surface provides access to experimental features. These features require setting `apiVersion: 'beta'` at the plugin or request level.

#### Effort levels

Control the computational effort Claude uses when generating responses (beta API only):

```typescript
const response = await ai.generate({
  model: anthropic.model('claude-opus-4-5'),
  prompt: 'Write a complex algorithm in Python.',
  config: {
    apiVersion: 'beta',
    output_config: {
      effort: 'high', // 'low', 'medium', or 'high'
    },
  },
});
```

Higher effort levels may produce more thoughtful responses, but take longer to generate.

#### Files API

Process documents using Anthropic's Files API (beta only). The file must be uploaded to Anthropic's Files API first. This plugin does not handle the file upload for you.

```typescript
const response = await ai.generate({
  model: anthropic.model('claude-sonnet-4-5'),
  messages: [
    {
      role: 'user',
      content: [
        { text: 'What are the key findings in this document?' },
        {
          media: {
            url: fileId,
            contentType: 'anthropic/file',
          },
        },
      ],
    },
  ],
  config: {
    apiVersion: 'beta',
  },
});
```

#### Additional beta parameters

Pass custom parameters to the beta API using the passthrough config:

```typescript
const response = await ai.generate({
  model: anthropic.model('claude-opus-4-5'),
  prompt: 'Generate a creative story.',
  config: {
    apiVersion: 'beta',
    betas: ['effort-2025-11-24'], // Enable specific beta features
    output_config: {
      effort: 'medium',
    },
  },
});
```

### Beta API Limitations

The beta API surface provides access to experimental features, but some server-managed tool blocks are not yet supported by this plugin. The following beta API features will cause an error if encountered:

- `web_fetch_tool_result`
- `code_execution_tool_result`
- `bash_code_execution_tool_result`
- `text_editor_code_execution_tool_result`
- `mcp_tool_result`
- `mcp_tool_use`
- `container_upload`

Note that `server_tool_use` and `web_search_tool_result` ARE supported and work with both stable and beta APIs.

### Within a flow

```typescript
import { z } from 'genkit';

// ...initialize Genkit instance (as shown above)...

export const jokeFlow = ai.defineFlow(
  {
    name: 'jokeFlow',
    inputSchema: z.string(),
    outputSchema: z.string(),
  },
  async (subject) => {
    const llmResponse = await ai.generate({
      prompt: `tell me a joke about ${subject}`,
    });
    return llmResponse.text;
  }
);
```

### Direct model usage (without Genkit instance)

The plugin supports Genkit Plugin API v2, which allows you to use models directly without initializing the full Genkit framework:

```typescript
import { anthropic } from '@genkit-ai/anthropic';

// Create a model reference directly
const claude = anthropic.model('claude-sonnet-4-5');

// Use the model directly
const response = await claude({
  messages: [
    {
      role: 'user',
      content: [{ text: 'Tell me a joke.' }],
    },
  ],
});

console.log(response);
```

You can also create model references using the plugin's `model()` method:

```typescript
import { anthropic } from '@genkit-ai/anthropic';

// Create model references
const claudeHaiku45 = anthropic.model('claude-haiku-4-5');
const claudeSonnet45 = anthropic.model('claude-sonnet-4-5');
const claudeOpus45 = anthropic.model('claude-opus-4-5');

// Use the model reference directly
const response = await claudeSonnet45({
  messages: [
    {
      role: 'user',
      content: [{ text: 'Hello!' }],
    },
  ],
});
```

This approach is useful for:

- Framework developers who need raw model access
- Testing models in isolation
- Using Genkit models in non-Genkit applications

## Examples

For comprehensive examples demonstrating all plugin features, see the [testapp](../../testapps/anthropic/).

## Acknowledgements

This plugin builds on the community work published as [`genkitx-anthropic`](https://github.com/BloomLabsInc/genkit-plugins/blob/main/plugins/anthropic/README.md) by Bloom Labs Inc. Their Apache 2.0–licensed implementation provided the foundation for this maintained package.

## Contributing

Want to contribute to the project? That's awesome! Head over to our [Contribution Guidelines](CONTRIBUTING.md).

## Need support?

> [!NOTE]
> This repository depends on Google's Firebase Genkit. For issues and questions related to Genkit, please refer to instructions available in [Genkit's repository](https://github.com/firebase/genkit).


## Credits

This plugin is maintained by Google with acknowledgement to the community contributions from [Bloom Labs Inc](https://github.com/BloomLabsInc).

## License

This project is licensed under the [Apache 2.0 License](https://github.com/BloomLabsInc/genkit-plugins/blob/main/LICENSE).
