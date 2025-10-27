# Checks Plugin Test App

This test app demonstrates the capabilities of the `@genkit-ai/checks` plugin, which provides AI safety guardrails and content classification using Google's Checks AI safety platform.

## Features

This test app includes:

- **Safety Middleware**: Real-time content filtering for model inputs and outputs
- **Multiple Flows**: Various examples of how to use checks in different scenarios
- **Evaluation Data**: Test datasets for offline safety evaluation
- **Configurable Thresholds**: Examples of customizing safety policy sensitivity

## Prerequisites

1. **Google Cloud Project**: You need a Google Cloud project with the Checks API enabled
2. **Authentication**: Set up Google Cloud authentication (see below)
3. **Quota Access**: The Checks API is in private preview - request access via the [Google form](https://docs.google.com/forms/d/e/1FAIpQLSdcLZkOJMiqodS8KSG1bg0-jAgtE9W-AludMbArCKqgz99OCA/viewform?usp=sf_link)

## Setup

### 1. Install Dependencies

From the root of the Genkit repository:

```bash
# Install all dependencies (including workspace dependencies)
pnpm install

# Or if using npm
npm install
```

Then navigate to the test app:

```bash
cd js/testapps/checks
```

### 2. Configure Authentication

**Set up Google AI API Key:**
```bash
export GEMINI_API_KEY=AIzaSyB0HmZY18l8YDlnw9XGHr89bCisoGjfXpg
# or
export GOOGLE_API_KEY=your-google-api-key
```

**Environment Variables:**
- `GEMINI_API_KEY` or `GOOGLE_API_KEY`: Required for Google AI models
- `GCLOUD_PROJECT`: Required for Checks API billing
- `GCLOUD_SERVICE_ACCOUNT_CREDS`: Optional, for service account authentication

**Set up Google Cloud authentication for Checks API:**

**Option A: Application Default Credentials (Recommended)**
```bash
gcloud auth application-default login
export GCLOUD_PROJECT=your-project-id
```

**Option B: Service Account Key**
```bash
export GCLOUD_SERVICE_ACCOUNT_CREDS='{"type":"service_account","project_id":"your-project-id",...}'
```

### 3. Build the App

```bash
npm run build
```

## Usage

### Start the Genkit UI

From the root of the Genkit repository:

```bash
genkit ui:start
```

### Run the App

From the test app directory:

```bash
cd js/testapps/checks
genkit start -- tsx --watch src/index.ts
```

Or use the npm script:

```bash
cd js/testapps/checks
npm run dev
```

### Test the Flows

Open the Genkit UI (usually at `localhost:4000`) and navigate to the **Flows** tab to test:

1. **safePoemFlow**: Creates poems with safety checks
2. **contentModerationFlow**: Moderates content with configurable strictness
3. **safetyEvaluationFlow**: Tests specific safety policies
4. **userInputProcessor**: Processes user input with automatic safety checks
5. **unsafePoemFlow**: Creates poems without safety checks (for comparison)

## Available Flows

### safePoemFlow
- **Input**: Topic string
- **Output**: Safe poem about the topic
- **Features**: Uses comprehensive safety checks with custom thresholds

### contentModerationFlow
- **Input**: Content string and optional strict mode flag
- **Output**: Moderated content or violation details
- **Features**: Configurable strictness levels

### safetyEvaluationFlow
- **Input**: Text and optional policy list
- **Output**: Safety analysis result
- **Features**: Test specific safety policies

### userInputProcessor
- **Input**: User input and optional context
- **Output**: Safe response with safety confirmation
- **Features**: Automatic safety checking

## Safety Policies

The app tests against these Google Checks safety policies:

- `DANGEROUS_CONTENT` - Harmful goods, services, and activities
- `PII_SOLICITING_RECITING` - Personal information disclosure
- `HARASSMENT` - Malicious, intimidating, or abusive content
- `SEXUALLY_EXPLICIT` - Sexually explicit content
- `HATE_SPEECH` - Violence, hatred, or discrimination
- `MEDICAL_INFO` - Health advice that could cause harm
- `VIOLENCE_AND_GORE` - Violent or gory content
- `OBSCENITY_AND_PROFANITY` - Vulgar or offensive language

## Evaluation

### Run Offline Evaluations

From the test app directory, test the safety evaluators with the provided datasets:

```bash
cd js/testapps/checks

# Test with mixed safe/unsafe content
genkit eval:run data/test-dataset.json --evaluators=checks/guardrails

# Test with only safe content
genkit eval:run data/safe-test-cases.json --evaluators=checks/guardrails

# Test with only unsafe content
genkit eval:run data/unsafe-test-cases.json --evaluators=checks/guardrails
```

### View Results

1. Start the app: `genkit start -- tsx --watch src/index.ts`
2. Open Genkit UI at `localhost:4000`
3. Navigate to the **Evaluate** tab
4. View detailed safety evaluation results

## Configuration Examples

### Custom Thresholds

```typescript
// Stricter thresholds (block more content)
{
  type: ChecksEvaluationMetricType.VIOLENCE_AND_GORE,
  threshold: 0.1, // Very strict
}

// More lenient thresholds (allow more content)
{
  type: ChecksEvaluationMetricType.OBSCENITY_AND_PROFANITY,
  threshold: 0.8, // More lenient
}
```

### Policy Selection

```typescript
// Use only specific policies
metrics: [
  ChecksEvaluationMetricType.DANGEROUS_CONTENT,
  ChecksEvaluationMetricType.HARASSMENT,
  ChecksEvaluationMetricType.HATE_SPEECH,
]
```

## Test Cases

The app includes three test datasets:

1. **test-dataset.json**: Mixed safe and potentially unsafe content
2. **safe-test-cases.json**: Only safe, appropriate content
3. **unsafe-test-cases.json**: Content that should trigger safety violations

## Troubleshooting

### Common Issues

1. **API Key Error**: Set the `GEMINI_API_KEY` or `GOOGLE_API_KEY` environment variable
2. **Authentication Error**: Ensure Google Cloud credentials are properly set up
3. **Quota Error**: Request access to the Checks API via the Google form
4. **Project ID Error**: Set the `GCLOUD_PROJECT` environment variable
5. **Build Error**: Run `pnpm install` from the root directory to ensure all dependencies are installed

### Debug Mode

Enable detailed logging by setting:
```bash
export DEBUG=genkit:*
```

## Learn More

- [Checks Plugin Documentation](../../plugins/checks/README.md)
- [Genkit Documentation](https://genkit.dev/docs/get-started)
- [Google Checks AI Safety Platform](https://checks.google.com/ai-safety)
