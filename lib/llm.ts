import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";

/**
 * Creates a new model based on the configured provider via the environment variable `CODIFY_LLM_PROVIDER`.
 */
function createModelFromProvider() {
  const providerName = process.env.CODIFY_LLM_PROVIDER;

  if (providerName === "local") {
    return createOpenAI({
      apiKey: process.env.CODIFY_LLM_API_KEY,
      baseURL: process.env.CODIFY_LLM_URL,
    });
  } else if (providerName === "anthropic") {
    return createAnthropic({
      apiKey: process.env.CODIFY_LLM_API_KEY,
    });
  }
  throw new Error(`Unable to create model from provider: ${providerName}`);
}

export const model = createModelFromProvider();
