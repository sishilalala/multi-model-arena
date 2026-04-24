import { getApiKey } from "@/lib/keychain.js";
import type { ProviderConfig, CustomModel } from "@/lib/config.js";
import { createAnthropicProvider } from "./anthropic-direct";
import { createGoogleProvider } from "./google-direct";
import { createOpenAICompatibleProvider } from "./openai-compatible";
import { createOpenRouterProvider } from "./openrouter";
import type { Provider } from "./types";

const OPENAI_BASE_URL = "https://api.openai.com/v1";
const DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1";

/**
 * Creates a Provider instance for the given ProviderConfig, fetching the API
 * key from the system keychain.  Returns null if no key is stored.
 */
export async function getProvider(providerConfig: ProviderConfig): Promise<Provider | null> {
  const apiKey = await getApiKey(providerConfig.id);
  if (!apiKey) return null;

  switch (providerConfig.type) {
    case "openrouter":
      return createOpenRouterProvider(apiKey);

    case "openai":
      return createOpenAICompatibleProvider({
        id: providerConfig.id,
        name: providerConfig.name,
        baseUrl: providerConfig.baseUrl || OPENAI_BASE_URL,
        apiKey,
      });

    case "deepseek":
      return createOpenAICompatibleProvider({
        id: providerConfig.id,
        name: providerConfig.name,
        baseUrl: providerConfig.baseUrl || DEEPSEEK_BASE_URL,
        apiKey,
      });

    case "anthropic":
      return createAnthropicProvider(apiKey);

    case "google":
      return createGoogleProvider(apiKey);

    case "custom":
      return createOpenAICompatibleProvider({
        id: providerConfig.id,
        name: providerConfig.name,
        baseUrl: providerConfig.baseUrl,
        apiKey,
      });

    default:
      return null;
  }
}

/**
 * Finds the appropriate provider for a given model ID.
 * Tries the default provider first, then falls back to other configured providers.
 */
export async function getProviderForModel(
  modelId: string,
  providers: ProviderConfig[],
  customModels?: CustomModel[]
): Promise<Provider | null> {
  // Check if this model has a specific provider assigned (custom models)
  if (customModels) {
    const customModel = customModels.find((m) => m.id === modelId);
    if (customModel) {
      const assignedProvider = providers.find((p) => p.id === customModel.providerId);
      if (assignedProvider) {
        const provider = await getProvider(assignedProvider);
        if (provider) return provider;
      }
    }
  }

  // For built-in models, try the default provider first
  const defaultProvider = providers.find((p) => p.isDefault);

  if (defaultProvider) {
    const provider = await getProvider(defaultProvider);
    if (provider) return provider;
  }

  // Fall back to the first provider with a stored key
  for (const config of providers) {
    if (config.isDefault) continue; // already tried above
    const provider = await getProvider(config);
    if (provider) return provider;
  }

  return null;
}

export type { Provider };
export type { ChatMessage, ChatResponse, UsageData } from "./types";
