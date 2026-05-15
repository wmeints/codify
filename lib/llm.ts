import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-5";
const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";

let cachedModel: LanguageModel | null = null;

/**
 * Resolves the language model lazily based on the configured provider
 * (`CODIFY_LLM_PROVIDER`). The specific model id is read from
 * `CODIFY_LLM_MODEL` and falls back to a provider-appropriate default.
 *
 * Lazy resolution avoids tripping the missing-env check during the Next.js
 * build phase, when environment variables are not loaded.
 */
export const getModel = (): LanguageModel => {
  if (cachedModel) {
    return cachedModel;
  }

  const providerName = process.env.CODIFY_LLM_PROVIDER;
  const modelId = process.env.CODIFY_LLM_MODEL;

  if (providerName === "local") {
    const openai = createOpenAI({
      apiKey: process.env.CODIFY_LLM_API_KEY,
      baseURL: process.env.CODIFY_LLM_URL,
    });
    cachedModel = openai(modelId ?? DEFAULT_OPENAI_MODEL);
    return cachedModel;
  }
  if (providerName === "anthropic") {
    const anthropic = createAnthropic({
      apiKey: process.env.CODIFY_LLM_API_KEY,
    });
    cachedModel = anthropic(modelId ?? DEFAULT_ANTHROPIC_MODEL);
    return cachedModel;
  }
  throw new Error(`Unable to create model from provider: ${providerName}`);
};
