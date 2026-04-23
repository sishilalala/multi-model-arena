import fs from "fs";
import path from "path";

const CONFIG_DIR = path.join(process.env.HOME || "~", ".multi-model-arena");
const CONFIG_PATH = path.join(CONFIG_DIR, "config.json");

export interface CustomModel {
  id: string;
  name: string;
  color: string;
  providerId: string;
}

export interface AppConfig {
  defaultModels: string[];
  moderatorModel: string;
  debateStyle: "collaborative" | "adversarial";
  temperature: number;
  monthlySpendingLimit: number;
  conversationsFolder: string;
  memoryEnabled: boolean;
  providers: ProviderConfig[];
  customModels: CustomModel[];
}

export interface ProviderConfig {
  id: string;
  name: string;
  type: "openrouter" | "openai" | "anthropic" | "google" | "deepseek" | "custom";
  baseUrl: string;
  isDefault: boolean;
}

const DEFAULT_CONFIG: AppConfig = {
  defaultModels: [
    "anthropic/claude-opus-4-6",
    "openai/gpt-5.4",
    "google/gemini-3-pro-preview",
  ],
  moderatorModel: "google/gemini-2.5-flash",
  debateStyle: "collaborative",
  temperature: 0.7,
  monthlySpendingLimit: 20,
  conversationsFolder: path.join(process.env.HOME || "~", "multi-model-arena", "conversations"),
  memoryEnabled: true,
  providers: [
    {
      id: "openrouter",
      name: "OpenRouter",
      type: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      isDefault: true,
    },
  ],
  customModels: [],
};

export function readConfig(): AppConfig {
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    if (!fs.existsSync(CONFIG_PATH)) {
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2));
      return { ...DEFAULT_CONFIG };
    }
    const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function writeConfig(config: Partial<AppConfig>): AppConfig {
  const current = readConfig();
  const updated = { ...current, ...config };
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(updated, null, 2));
  return updated;
}
