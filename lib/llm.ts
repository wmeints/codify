import {createOpenAI} from '@ai-sdk/openai'
import {createAnthropic} from '@ai-sdk/anthropic'

/**
 * Creates a new model based on the configured provider via the environment variable `CODIFY_LLM_PROVIDER`.
 */
function createModelFromProvider() {
    const providerName = process.env.CODIFY_LLM_PROVIDER

    if(providerName === 'local') {
        return createOpenAI({
            baseURL: process.env.CODIFY_LLM_URL,
            apiKey: process.env.CODIFY_LLM_API_KEY,
        })
    } else if(providerName === 'anthropic') {
        return createAnthropic({
            apiKey: process.env.CODIFY_LLM_API_KEY,
        })
    } else {
        throw new Error(`Unable to create model from provider: ${providerName}`)
    }
}

export const model = createModelFromProvider();