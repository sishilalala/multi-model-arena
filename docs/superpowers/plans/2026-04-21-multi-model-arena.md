# Multi-Model Arena Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local desktop app where multiple AI models debate in a group chat, with conversations saved as markdown files.

**Architecture:** Next.js app running locally. API routes handle OpenRouter/provider calls and stream responses via Server-Sent Events. Conversations stored as markdown files on disk. Config stored as JSON. API keys stored in macOS Keychain via the `keytar` library. No database, no cloud, no auth.

**Tech Stack:** Next.js 15, React 19, Tailwind CSS 4, TypeScript, `openai` SDK (OpenAI-compatible for all providers), `keytar` (secure credential storage), Node.js `fs` (file I/O)

---

## File Structure

```
multi-model-arena/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout with global styles
│   │   ├── page.tsx                # Main chat page
│   │   ├── settings/
│   │   │   └── page.tsx            # Settings page
│   │   └── api/
│   │       ├── chat/
│   │       │   └── route.ts        # Stream chat responses from models
│   │       ├── summarize/
│   │       │   └── route.ts        # Stream moderator summary
│   │       ├── conversations/
│   │       │   └── route.ts        # List, delete, clear conversations
│   │       ├── settings/
│   │       │   └── route.ts        # Read/write config.json
│   │       ├── keys/
│   │       │   └── route.ts        # Store/retrieve API keys via keytar
│   │       ├── memory/
│   │       │   └── route.ts        # Read/update memory.md
│   │       ├── usage/
│   │       │   └── route.ts        # Read/update usage.json
│   │       └── health/
│   │           └── route.ts        # Check internet + provider connectivity
│   ├── lib/
│   │   ├── providers/
│   │   │   ├── types.ts            # Provider interface definition
│   │   │   ├── openrouter.ts       # OpenRouter provider
│   │   │   ├── openai-direct.ts    # Direct OpenAI provider
│   │   │   ├── anthropic-direct.ts # Direct Anthropic provider
│   │   │   ├── google-direct.ts    # Direct Google/Gemini provider
│   │   │   ├── deepseek-direct.ts  # Direct DeepSeek provider
│   │   │   ├── custom.ts           # Any OpenAI-compatible endpoint
│   │   │   └── index.ts            # Provider registry + routing
│   │   ├── config.ts               # Read/write ~/.multi-model-arena/config.json
│   │   ├── conversations.ts        # Read/write/delete markdown files
│   │   ├── memory.ts               # Read/write/generate memory.md
│   │   ├── usage.ts                # Cost tracking + spending limits
│   │   ├── language.ts             # Detect language of first message
│   │   ├── prompts.ts              # System prompts for debate + summary
│   │   └── models.ts               # Default model list + aliases
│   └── components/
│       ├── ChatArea.tsx             # Main chat message display
│       ├── ChatMessage.tsx          # Single message bubble with model color + cost
│       ├── ChatInput.tsx            # Text input + send button
│       ├── Sidebar.tsx              # Conversation history list
│       ├── ControlBar.tsx           # Keep Debating / Summarize / round counter / cost estimate
│       ├── ModelSelector.tsx        # Checkbox model picker (in control bar)
│       ├── SummaryMessage.tsx       # Special formatted summary with copy button
│       ├── ConnectionStatus.tsx     # Green/red dot indicator
│       ├── SetupWizard.tsx          # First-time API key entry
│       ├── settings/
│       │   ├── ApiProviders.tsx     # Provider list + add/remove/status
│       │   ├── DefaultModels.tsx    # Model toggle checkboxes
│       │   ├── ModeratorPicker.tsx  # Moderator model selector
│       │   ├── DebateStyle.tsx      # Collaborative vs Adversarial toggle
│       │   ├── TemperatureSlider.tsx # Focused ↔ Creative slider
│       │   ├── CostTracker.tsx      # Monthly cost display + chart
│       │   ├── SpendingLimit.tsx    # Budget cap setting
│       │   ├── ConversationsFolder.tsx # Folder path + move files
│       │   └── ClearHistory.tsx     # Clear all with DELETE ALL confirmation
│       └── ui/
│           ├── Button.tsx           # Reusable button component
│           ├── Dialog.tsx           # Confirmation dialog
│           └── Slider.tsx           # Range slider component
├── public/
│   └── favicon.ico
├── tailwind.config.ts
├── tsconfig.json
├── next.config.ts
├── package.json
└── docs/
    └── superpowers/
        ├── specs/
        │   └── 2026-04-21-multi-model-arena-design.md
        └── plans/
            └── 2026-04-21-multi-model-arena.md
```

---

## Task 1: Project Setup (clean slate with Next.js)

**Files:**
- Delete: `server.js`, `.env.example`, `public/` (old Express files)
- Delete: `node_modules/`, `package-lock.json` (old dependencies)
- Create: `package.json` (new, Next.js-based)
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `tailwind.config.ts`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `.gitignore`

- [ ] **Step 1: Remove old Express project files**

```bash
cd ~/multi-model-arena
rm -f server.js .env.example
rm -rf node_modules package-lock.json public
```

- [ ] **Step 2: Initialize Next.js project**

```bash
cd ~/multi-model-arena
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes
```

Expected: Next.js project created with `src/app/` structure, Tailwind configured, TypeScript enabled.

- [ ] **Step 3: Install additional dependencies**

```bash
cd ~/multi-model-arena
npm install openai keytar slugify
npm install -D @types/node
```

- `openai`: OpenAI-compatible SDK (works with OpenRouter and all providers)
- `keytar`: Secure credential storage (macOS Keychain)
- `slugify`: Generate clean filenames from conversation titles

- [ ] **Step 4: Create the config directory structure**

```bash
mkdir -p ~/.multi-model-arena
mkdir -p ~/multi-model-arena/conversations
```

- [ ] **Step 5: Update `.gitignore`**

Replace the generated `.gitignore` with:

```
node_modules
.next
.env
.env.local
*.tsbuildinfo
next-env.d.ts
```

- [ ] **Step 6: Verify the app starts**

```bash
cd ~/multi-model-arena
npm run dev
```

Expected: App runs at `http://localhost:3000`, shows the default Next.js page.

- [ ] **Step 7: Commit**

```bash
cd ~/multi-model-arena
git init
git add -A
git commit -m "feat: initialize Next.js project with TypeScript and Tailwind"
```

---

## Task 2: Config and Models Foundation

**Files:**
- Create: `src/lib/config.ts`
- Create: `src/lib/models.ts`
- Create: `src/app/api/settings/route.ts`

- [ ] **Step 1: Create the config module**

Create `src/lib/config.ts`:

```typescript
import fs from "fs";
import path from "path";

const CONFIG_DIR = path.join(process.env.HOME || "~", ".multi-model-arena");
const CONFIG_PATH = path.join(CONFIG_DIR, "config.json");

export interface AppConfig {
  defaultModels: string[];
  moderatorModel: string;
  debateStyle: "collaborative" | "adversarial";
  temperature: number;
  monthlySpendingLimit: number;
  conversationsFolder: string;
  memoryEnabled: boolean;
  providers: ProviderConfig[];
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
    "anthropic/claude-sonnet",
    "openai/gpt-4o",
    "google/gemini-2.5-flash-preview",
    "deepseek/deepseek-r1",
  ],
  moderatorModel: "google/gemini-2.5-flash-preview",
  debateStyle: "collaborative",
  temperature: 0.7,
  monthlySpendingLimit: 20,
  conversationsFolder: path.join(
    process.env.HOME || "~",
    "multi-model-arena",
    "conversations"
  ),
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
```

- [ ] **Step 2: Create the models module**

Create `src/lib/models.ts`:

```typescript
export interface ModelInfo {
  id: string;
  name: string;
  color: string;
  providerId: string;
}

export const DEFAULT_MODELS: ModelInfo[] = [
  {
    id: "anthropic/claude-sonnet",
    name: "Claude Sonnet",
    color: "#d97706",
    providerId: "openrouter",
  },
  {
    id: "openai/gpt-4o",
    name: "GPT-4o",
    color: "#10b981",
    providerId: "openrouter",
  },
  {
    id: "google/gemini-2.5-flash-preview",
    name: "Gemini Flash",
    color: "#3b82f6",
    providerId: "openrouter",
  },
  {
    id: "deepseek/deepseek-r1",
    name: "DeepSeek R1",
    color: "#ef4444",
    providerId: "openrouter",
  },
  {
    id: "meta-llama/llama-4-maverick",
    name: "Llama 4 Maverick",
    color: "#8b5cf6",
    providerId: "openrouter",
  },
  {
    id: "mistralai/mistral-medium-3",
    name: "Mistral Medium 3",
    color: "#f97316",
    providerId: "openrouter",
  },
];

export function getModelInfo(modelId: string): ModelInfo {
  const found = DEFAULT_MODELS.find((m) => m.id === modelId);
  if (found) return found;
  return {
    id: modelId,
    name: modelId.split("/").pop() || modelId,
    color: "#6b7280",
    providerId: "openrouter",
  };
}
```

- [ ] **Step 3: Create the settings API route**

Create `src/app/api/settings/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { readConfig, writeConfig } from "@/lib/config";

export async function GET() {
  const config = readConfig();
  return NextResponse.json(config);
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const updated = writeConfig(body);
  return NextResponse.json(updated);
}
```

- [ ] **Step 4: Verify the API route works**

```bash
cd ~/multi-model-arena
npm run dev &
sleep 3
curl http://localhost:3000/api/settings | python3 -m json.tool
kill %1
```

Expected: Returns the default config JSON with defaultModels, moderatorModel, etc.

- [ ] **Step 5: Commit**

```bash
cd ~/multi-model-arena
git add src/lib/config.ts src/lib/models.ts src/app/api/settings/route.ts
git commit -m "feat: add config management and model definitions"
```

---

## Task 3: API Key Storage (Keychain)

**Files:**
- Create: `src/app/api/keys/route.ts`

- [ ] **Step 1: Create the keys API route**

Create `src/app/api/keys/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import keytar from "keytar";

const SERVICE_NAME = "multi-model-arena";

export async function GET(request: NextRequest) {
  const providerId = request.nextUrl.searchParams.get("providerId");
  if (!providerId) {
    return NextResponse.json({ error: "providerId required" }, { status: 400 });
  }
  const key = await keytar.getPassword(SERVICE_NAME, providerId);
  return NextResponse.json({ hasKey: !!key });
}

export async function PUT(request: NextRequest) {
  const { providerId, apiKey } = await request.json();
  if (!providerId || !apiKey) {
    return NextResponse.json(
      { error: "providerId and apiKey required" },
      { status: 400 }
    );
  }
  await keytar.setPassword(SERVICE_NAME, providerId, apiKey);
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const { providerId } = await request.json();
  if (!providerId) {
    return NextResponse.json({ error: "providerId required" }, { status: 400 });
  }
  await keytar.deletePassword(SERVICE_NAME, providerId);
  return NextResponse.json({ success: true });
}

// Internal helper - not an API route, used by other server-side code
export async function getApiKey(providerId: string): Promise<string | null> {
  return keytar.getPassword(SERVICE_NAME, providerId);
}
```

- [ ] **Step 2: Verify keytar works**

```bash
cd ~/multi-model-arena
npm run dev &
sleep 3
curl -X PUT http://localhost:3000/api/keys \
  -H "Content-Type: application/json" \
  -d '{"providerId":"openrouter","apiKey":"test-key-123"}'
curl "http://localhost:3000/api/keys?providerId=openrouter"
kill %1
```

Expected: PUT returns `{"success":true}`, GET returns `{"hasKey":true}`.

- [ ] **Step 3: Clean up test key**

```bash
cd ~/multi-model-arena
npm run dev &
sleep 3
curl -X DELETE http://localhost:3000/api/keys \
  -H "Content-Type: application/json" \
  -d '{"providerId":"openrouter"}'
kill %1
```

- [ ] **Step 4: Commit**

```bash
cd ~/multi-model-arena
git add src/app/api/keys/route.ts
git commit -m "feat: add secure API key storage via system keychain"
```

---

## Task 4: Provider System

**Files:**
- Create: `src/lib/providers/types.ts`
- Create: `src/lib/providers/openrouter.ts`
- Create: `src/lib/providers/openai-direct.ts`
- Create: `src/lib/providers/anthropic-direct.ts`
- Create: `src/lib/providers/google-direct.ts`
- Create: `src/lib/providers/deepseek-direct.ts`
- Create: `src/lib/providers/custom.ts`
- Create: `src/lib/providers/index.ts`

- [ ] **Step 1: Define the provider interface**

Create `src/lib/providers/types.ts`:

```typescript
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface StreamChunk {
  content: string;
  done: boolean;
}

export interface UsageData {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number | null;
}

export interface ChatResponse {
  stream: ReadableStream<Uint8Array>;
  getUsage: () => Promise<UsageData>;
}

export interface Provider {
  id: string;
  name: string;
  chat(params: {
    model: string;
    messages: ChatMessage[];
    temperature: number;
  }): Promise<ChatResponse>;
  validateKey(apiKey: string): Promise<boolean>;
}
```

- [ ] **Step 2: Create the OpenRouter provider**

Create `src/lib/providers/openrouter.ts`:

```typescript
import OpenAI from "openai";
import { Provider, ChatMessage, ChatResponse, UsageData } from "./types";

export function createOpenRouterProvider(apiKey: string): Provider {
  const client = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey,
  });

  return {
    id: "openrouter",
    name: "OpenRouter",

    async chat({ model, messages, temperature }): Promise<ChatResponse> {
      let usage: UsageData = {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        cost: null,
      };

      const stream = await client.chat.completions.create({
        model,
        messages,
        temperature,
        stream: true,
        stream_options: { include_usage: true },
      });

      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of stream) {
              if (chunk.usage) {
                usage = {
                  promptTokens: chunk.usage.prompt_tokens || 0,
                  completionTokens: chunk.usage.completion_tokens || 0,
                  totalTokens: chunk.usage.total_tokens || 0,
                  cost: null,
                };
              }
              const content = chunk.choices[0]?.delta?.content;
              if (content) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ content })}\n\n`)
                );
              }
            }
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          } catch (err) {
            const message =
              err instanceof Error ? err.message : "Unknown error";
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ error: message })}\n\n`
              )
            );
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          }
        },
      });

      return {
        stream: readable,
        getUsage: async () => usage,
      };
    },

    async validateKey(apiKey: string): Promise<boolean> {
      try {
        const testClient = new OpenAI({
          baseURL: "https://openrouter.ai/api/v1",
          apiKey,
        });
        await testClient.models.list();
        return true;
      } catch {
        return false;
      }
    },
  };
}
```

- [ ] **Step 3: Create the generic OpenAI-compatible provider factory**

This factory creates providers for OpenAI direct, DeepSeek direct, and custom endpoints since they all use the same OpenAI-compatible protocol.

Create `src/lib/providers/openai-compatible.ts`:

```typescript
import OpenAI from "openai";
import { Provider, ChatResponse, UsageData } from "./types";

export function createOpenAICompatibleProvider(params: {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
}): Provider {
  const client = new OpenAI({
    baseURL: params.baseUrl,
    apiKey: params.apiKey,
  });

  return {
    id: params.id,
    name: params.name,

    async chat({ model, messages, temperature }): Promise<ChatResponse> {
      let usage: UsageData = {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        cost: null,
      };

      const stream = await client.chat.completions.create({
        model,
        messages,
        temperature,
        stream: true,
      });

      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of stream) {
              if (chunk.usage) {
                usage = {
                  promptTokens: chunk.usage.prompt_tokens || 0,
                  completionTokens: chunk.usage.completion_tokens || 0,
                  totalTokens: chunk.usage.total_tokens || 0,
                  cost: null,
                };
              }
              const content = chunk.choices[0]?.delta?.content;
              if (content) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ content })}\n\n`)
                );
              }
            }
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          } catch (err) {
            const message =
              err instanceof Error ? err.message : "Unknown error";
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ error: message })}\n\n`
              )
            );
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          }
        },
      });

      return {
        stream: readable,
        getUsage: async () => usage,
      };
    },

    async validateKey(apiKey: string): Promise<boolean> {
      try {
        const testClient = new OpenAI({
          baseURL: params.baseUrl,
          apiKey,
        });
        await testClient.models.list();
        return true;
      } catch {
        return false;
      }
    },
  };
}
```

- [ ] **Step 4: Create the Anthropic direct provider**

Anthropic uses a different API format, so it needs its own provider.

Create `src/lib/providers/anthropic-direct.ts`:

```typescript
import { Provider, ChatMessage, ChatResponse, UsageData } from "./types";

export function createAnthropicProvider(apiKey: string): Provider {
  return {
    id: "anthropic",
    name: "Anthropic Direct",

    async chat({ model, messages, temperature }): Promise<ChatResponse> {
      let usage: UsageData = {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        cost: null,
      };

      const systemMsg = messages.find((m) => m.role === "system");
      const nonSystemMsgs = messages.filter((m) => m.role !== "system");

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: 4096,
          temperature,
          system: systemMsg?.content || "",
          messages: nonSystemMsgs.map((m) => ({
            role: m.role === "assistant" ? "assistant" : "user",
            content: m.content,
          })),
          stream: true,
        }),
      });

      const encoder = new TextEncoder();
      const decoder = new TextDecoder();

      const readable = new ReadableStream({
        async start(controller) {
          try {
            const reader = response.body!.getReader();
            let buffer = "";

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                if (!line.startsWith("data: ")) continue;
                const data = JSON.parse(line.slice(6));

                if (data.type === "content_block_delta") {
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({ content: data.delta.text })}\n\n`
                    )
                  );
                }
                if (data.type === "message_delta" && data.usage) {
                  usage.completionTokens = data.usage.output_tokens || 0;
                }
                if (data.type === "message_start" && data.message?.usage) {
                  usage.promptTokens = data.message.usage.input_tokens || 0;
                }
              }
            }

            usage.totalTokens = usage.promptTokens + usage.completionTokens;
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          } catch (err) {
            const message =
              err instanceof Error ? err.message : "Unknown error";
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ error: message })}\n\n`
              )
            );
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          }
        },
      });

      return {
        stream: readable,
        getUsage: async () => usage,
      };
    },

    async validateKey(apiKey: string): Promise<boolean> {
      try {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 1,
            messages: [{ role: "user", content: "hi" }],
          }),
        });
        return res.ok;
      } catch {
        return false;
      }
    },
  };
}
```

- [ ] **Step 5: Create the Google direct provider**

Create `src/lib/providers/google-direct.ts`:

```typescript
import { Provider, ChatMessage, ChatResponse, UsageData } from "./types";
import { createOpenAICompatibleProvider } from "./openai-compatible";

export function createGoogleProvider(apiKey: string): Provider {
  // Google's Gemini API supports OpenAI-compatible mode
  const base = createOpenAICompatibleProvider({
    id: "google",
    name: "Google AI Direct",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    apiKey,
  });
  return base;
}
```

- [ ] **Step 6: Create the provider registry**

Create `src/lib/providers/index.ts`:

```typescript
import keytar from "keytar";
import { Provider } from "./types";
import { createOpenRouterProvider } from "./openrouter";
import { createOpenAICompatibleProvider } from "./openai-compatible";
import { createAnthropicProvider } from "./anthropic-direct";
import { createGoogleProvider } from "./google-direct";
import { ProviderConfig } from "@/lib/config";

const SERVICE_NAME = "multi-model-arena";

const PROVIDER_URLS: Record<string, string> = {
  openai: "https://api.openai.com/v1",
  deepseek: "https://api.deepseek.com/v1",
};

export async function getProvider(
  providerConfig: ProviderConfig
): Promise<Provider | null> {
  const apiKey = await keytar.getPassword(SERVICE_NAME, providerConfig.id);
  if (!apiKey) return null;

  switch (providerConfig.type) {
    case "openrouter":
      return createOpenRouterProvider(apiKey);
    case "anthropic":
      return createAnthropicProvider(apiKey);
    case "google":
      return createGoogleProvider(apiKey);
    case "openai":
    case "deepseek":
      return createOpenAICompatibleProvider({
        id: providerConfig.id,
        name: providerConfig.name,
        baseUrl: PROVIDER_URLS[providerConfig.type] || providerConfig.baseUrl,
        apiKey,
      });
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

export async function getProviderForModel(
  modelId: string,
  providers: ProviderConfig[]
): Promise<Provider | null> {
  // Find the default provider first, fall back to first available
  const defaultProvider = providers.find((p) => p.isDefault);
  if (defaultProvider) {
    const provider = await getProvider(defaultProvider);
    if (provider) return provider;
  }

  // Try each provider until one works
  for (const config of providers) {
    const provider = await getProvider(config);
    if (provider) return provider;
  }

  return null;
}
```

- [ ] **Step 7: Commit**

```bash
cd ~/multi-model-arena
git add src/lib/providers/
git commit -m "feat: add multi-provider system (OpenRouter, OpenAI, Anthropic, Google, DeepSeek, custom)"
```

---

## Task 5: Conversation Storage (Markdown Files)

**Files:**
- Create: `src/lib/conversations.ts`
- Create: `src/lib/language.ts`
- Create: `src/app/api/conversations/route.ts`

- [ ] **Step 1: Create the language detection module**

Create `src/lib/language.ts`:

```typescript
export function detectLanguage(text: string): string {
  // Simple heuristic based on Unicode ranges
  const cjkRegex = /[\u4e00-\u9fff\u3400-\u4dbf]/;
  const japaneseRegex = /[\u3040-\u309f\u30a0-\u30ff]/;
  const koreanRegex = /[\uac00-\ud7af\u1100-\u11ff]/;
  const arabicRegex = /[\u0600-\u06ff]/;
  const cyrillicRegex = /[\u0400-\u04ff]/;
  const thaiRegex = /[\u0e00-\u0e7f]/;

  if (japaneseRegex.test(text)) return "Japanese";
  if (koreanRegex.test(text)) return "Korean";
  if (cjkRegex.test(text)) return "Chinese";
  if (arabicRegex.test(text)) return "Arabic";
  if (cyrillicRegex.test(text)) return "Russian";
  if (thaiRegex.test(text)) return "Thai";
  return "English";
}
```

- [ ] **Step 2: Create the conversations module**

Create `src/lib/conversations.ts`:

```typescript
import fs from "fs";
import path from "path";
import slugify from "slugify";
import { readConfig } from "./config";

export interface ConversationMeta {
  id: string;
  title: string;
  date: string;
  models: string[];
  rounds: number;
  filename: string;
}

export interface ConversationMessage {
  role: "user" | "model" | "moderator";
  modelName?: string;
  content: string;
  round: number;
  cost?: number;
}

export interface Conversation {
  meta: ConversationMeta;
  messages: ConversationMessage[];
}

function getConversationsDir(): string {
  const config = readConfig();
  const dir = config.conversationsFolder;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function listConversations(): ConversationMeta[] {
  const dir = getConversationsDir();
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md") && f !== "memory.md")
    .sort()
    .reverse();

  return files.map((filename) => {
    const content = fs.readFileSync(path.join(dir, filename), "utf-8");
    const titleMatch = content.match(/^# (.+)$/m);
    const dateMatch = content.match(/\*Date: (.+)\*/);
    const modelsMatch = content.match(/\*Models: (.+)\*/);
    const roundsMatch = content.match(/\*Debate rounds: (\d+)\*/);

    return {
      id: filename.replace(".md", ""),
      title: titleMatch?.[1] || filename,
      date: dateMatch?.[1] || "",
      models: modelsMatch?.[1]?.split(", ") || [],
      rounds: parseInt(roundsMatch?.[1] || "0"),
      filename,
    };
  });
}

export function readConversation(id: string): string | null {
  const dir = getConversationsDir();
  const filepath = path.join(dir, `${id}.md`);
  if (!fs.existsSync(filepath)) return null;
  return fs.readFileSync(filepath, "utf-8");
}

export function createConversation(
  title: string,
  models: string[],
  language: string
): string {
  const dir = getConversationsDir();
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10);
  const timeStr = date.toTimeString().slice(0, 5);
  const slug = slugify(title.slice(0, 60), {
    lower: true,
    strict: true,
  });
  const filename = `${dateStr}-${slug || "conversation"}`;
  const filepath = path.join(dir, `${filename}.md`);

  const header = `# ${title}

*Date: ${dateStr} ${timeStr}*
*Models: ${models.join(", ")}*
*Language: ${language}*
*Debate rounds: 0*

`;

  fs.writeFileSync(filepath, header);
  return filename;
}

export function appendToConversation(
  id: string,
  content: string
): void {
  const dir = getConversationsDir();
  const filepath = path.join(dir, `${id}.md`);
  fs.appendFileSync(filepath, content);
}

export function updateRoundCount(id: string, rounds: number): void {
  const dir = getConversationsDir();
  const filepath = path.join(dir, `${id}.md`);
  let content = fs.readFileSync(filepath, "utf-8");
  content = content.replace(
    /\*Debate rounds: \d+\*/,
    `*Debate rounds: ${rounds}*`
  );
  fs.writeFileSync(filepath, content);
}

export function deleteConversation(id: string): boolean {
  const dir = getConversationsDir();
  const filepath = path.join(dir, `${id}.md`);
  if (!fs.existsSync(filepath)) return false;
  fs.unlinkSync(filepath);
  return true;
}

export function clearAllConversations(): number {
  const dir = getConversationsDir();
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md") && f !== "memory.md");
  files.forEach((f) => fs.unlinkSync(path.join(dir, f)));
  return files.length;
}

export function moveConversationsFolder(
  oldDir: string,
  newDir: string
): void {
  if (!fs.existsSync(newDir)) {
    fs.mkdirSync(newDir, { recursive: true });
  }
  if (!fs.existsSync(oldDir)) return;

  const files = fs.readdirSync(oldDir).filter((f) => f.endsWith(".md"));
  for (const file of files) {
    fs.renameSync(path.join(oldDir, file), path.join(newDir, file));
  }

  // Also move usage.json if it exists in old dir
  const usagePath = path.join(oldDir, "usage.json");
  if (fs.existsSync(usagePath)) {
    fs.renameSync(usagePath, path.join(newDir, "usage.json"));
  }
}
```

- [ ] **Step 3: Create the conversations API route**

Create `src/app/api/conversations/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import {
  listConversations,
  readConversation,
  deleteConversation,
  clearAllConversations,
} from "@/lib/conversations";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");

  if (id) {
    const content = readConversation(id);
    if (!content) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ id, content });
  }

  const conversations = listConversations();
  return NextResponse.json(conversations);
}

export async function DELETE(request: NextRequest) {
  const { id, clearAll, confirmation } = await request.json();

  if (clearAll) {
    if (confirmation !== "DELETE ALL") {
      return NextResponse.json(
        { error: 'Type "DELETE ALL" to confirm' },
        { status: 400 }
      );
    }
    const count = clearAllConversations();
    return NextResponse.json({ deleted: count });
  }

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const deleted = deleteConversation(id);
  if (!deleted) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 }
    );
  }
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 4: Commit**

```bash
cd ~/multi-model-arena
git add src/lib/conversations.ts src/lib/language.ts src/app/api/conversations/route.ts
git commit -m "feat: add conversation storage as markdown files with list/read/delete"
```

---

## Task 6: Cost Tracking and Spending Limits

**Files:**
- Create: `src/lib/usage.ts`
- Create: `src/app/api/usage/route.ts`

- [ ] **Step 1: Create the usage tracking module**

Create `src/lib/usage.ts`:

```typescript
import fs from "fs";
import path from "path";

const CONFIG_DIR = path.join(process.env.HOME || "~", ".multi-model-arena");
const USAGE_PATH = path.join(CONFIG_DIR, "usage.json");

export interface UsageEntry {
  conversationId: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  cost: number;
  timestamp: string;
}

export interface MonthlyUsage {
  month: string; // "2026-04"
  totalCost: number;
  entries: UsageEntry[];
}

function getCurrentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

function readUsageFile(): Record<string, MonthlyUsage> {
  try {
    if (!fs.existsSync(USAGE_PATH)) return {};
    return JSON.parse(fs.readFileSync(USAGE_PATH, "utf-8"));
  } catch {
    return {};
  }
}

function writeUsageFile(data: Record<string, MonthlyUsage>): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  fs.writeFileSync(USAGE_PATH, JSON.stringify(data, null, 2));
}

export function recordUsage(entry: UsageEntry): void {
  const data = readUsageFile();
  const month = getCurrentMonth();

  if (!data[month]) {
    data[month] = { month, totalCost: 0, entries: [] };
  }

  data[month].entries.push(entry);
  data[month].totalCost = data[month].entries.reduce(
    (sum, e) => sum + e.cost,
    0
  );

  writeUsageFile(data);
}

export function getMonthlyUsage(): MonthlyUsage {
  const data = readUsageFile();
  const month = getCurrentMonth();
  return data[month] || { month, totalCost: 0, entries: [] };
}

export function getConversationCost(conversationId: string): number {
  const usage = getMonthlyUsage();
  return usage.entries
    .filter((e) => e.conversationId === conversationId)
    .reduce((sum, e) => sum + e.cost, 0);
}

export function isOverBudget(monthlyLimit: number): boolean {
  const usage = getMonthlyUsage();
  return usage.totalCost >= monthlyLimit;
}

export function estimateRoundCost(
  modelCount: number,
  conversationTokens: number
): number {
  // Rough estimate: each model reads full context + produces ~500 tokens
  // Using average OpenRouter pricing (~$1/MTok input, ~$5/MTok output)
  const inputCost = (conversationTokens * modelCount * 1) / 1_000_000;
  const outputCost = (500 * modelCount * 5) / 1_000_000;
  return Math.round((inputCost + outputCost) * 1000) / 1000;
}
```

- [ ] **Step 2: Create the usage API route**

Create `src/app/api/usage/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import {
  getMonthlyUsage,
  getConversationCost,
  recordUsage,
  isOverBudget,
  estimateRoundCost,
} from "@/lib/usage";
import { readConfig } from "@/lib/config";

export async function GET(request: NextRequest) {
  const conversationId = request.nextUrl.searchParams.get("conversationId");
  const checkBudget = request.nextUrl.searchParams.get("checkBudget");
  const estimateParam = request.nextUrl.searchParams.get("estimate");

  if (checkBudget) {
    const config = readConfig();
    const overBudget = isOverBudget(config.monthlySpendingLimit);
    const usage = getMonthlyUsage();
    return NextResponse.json({
      overBudget,
      currentSpend: usage.totalCost,
      limit: config.monthlySpendingLimit,
    });
  }

  if (estimateParam) {
    const modelCount = parseInt(
      request.nextUrl.searchParams.get("modelCount") || "4"
    );
    const tokens = parseInt(
      request.nextUrl.searchParams.get("tokens") || "2000"
    );
    const estimate = estimateRoundCost(modelCount, tokens);
    return NextResponse.json({ estimate });
  }

  if (conversationId) {
    const cost = getConversationCost(conversationId);
    return NextResponse.json({ conversationId, cost });
  }

  const usage = getMonthlyUsage();

  // Build per-model breakdown
  const byModel: Record<string, number> = {};
  for (const entry of usage.entries) {
    byModel[entry.model] = (byModel[entry.model] || 0) + entry.cost;
  }

  return NextResponse.json({
    month: usage.month,
    totalCost: usage.totalCost,
    byModel,
    entryCount: usage.entries.length,
  });
}

export async function POST(request: NextRequest) {
  const entry = await request.json();
  recordUsage(entry);
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: Commit**

```bash
cd ~/multi-model-arena
git add src/lib/usage.ts src/app/api/usage/route.ts
git commit -m "feat: add cost tracking with monthly budgets and per-model breakdown"
```

---

## Task 7: Conversation Memory

**Files:**
- Create: `src/lib/memory.ts`
- Create: `src/app/api/memory/route.ts`

- [ ] **Step 1: Create the memory module**

Create `src/lib/memory.ts`:

```typescript
import fs from "fs";
import path from "path";
import { readConfig } from "./config";

function getMemoryPath(): string {
  const config = readConfig();
  return path.join(config.conversationsFolder, "memory.md");
}

export function readMemory(): string {
  try {
    const memoryPath = getMemoryPath();
    if (!fs.existsSync(memoryPath)) return "";
    return fs.readFileSync(memoryPath, "utf-8");
  } catch {
    // If memory.md is corrupted or unreadable, ignore it
    return "";
  }
}

export function updateMemory(conversationTitle: string, summary: string): void {
  const memoryPath = getMemoryPath();
  const date = new Date().toISOString().slice(0, 10);

  let existing = readMemory();

  // Parse existing entries
  const entries: { date: string; title: string; summary: string }[] = [];
  const entryRegex = /### (.+?) \((.+?)\)\n([\s\S]*?)(?=\n### |\n*$)/g;
  let match;
  while ((match = entryRegex.exec(existing)) !== null) {
    entries.push({
      title: match[1],
      date: match[2],
      summary: match[3].trim(),
    });
  }

  // Add new entry at the beginning
  entries.unshift({
    date,
    title: conversationTitle,
    summary: summary.slice(0, 500), // Keep summaries concise
  });

  // Keep only last 10
  const recent = entries.slice(0, 10);

  // Write back
  const content = `# Conversation Memory

*Auto-updated. Last 10 conversations summarized for context.*

${recent.map((e) => `### ${e.title} (${e.date})\n${e.summary}`).join("\n\n")}
`;

  const dir = path.dirname(memoryPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(memoryPath, content);
}
```

- [ ] **Step 2: Create the memory API route**

Create `src/app/api/memory/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { readMemory } from "@/lib/memory";
import { readConfig } from "@/lib/config";

export async function GET() {
  const config = readConfig();
  if (!config.memoryEnabled) {
    return NextResponse.json({ memory: "", enabled: false });
  }
  const memory = readMemory();
  return NextResponse.json({ memory, enabled: true });
}
```

- [ ] **Step 3: Commit**

```bash
cd ~/multi-model-arena
git add src/lib/memory.ts src/app/api/memory/route.ts
git commit -m "feat: add conversation memory with rolling 10-conversation summary"
```

---

## Task 8: Chat and Debate System Prompts

**Files:**
- Create: `src/lib/prompts.ts`

- [ ] **Step 1: Create the prompts module**

Create `src/lib/prompts.ts`:

```typescript
export function buildInitialPrompt(params: {
  language: string;
  debateStyle: "collaborative" | "adversarial";
  modelName: string;
  memory: string;
}): string {
  const styleInstruction =
    params.debateStyle === "adversarial"
      ? "You should actively challenge assumptions, point out weaknesses in arguments, and present strong counterpoints. Be respectful but rigorous."
      : "You should build on good ideas from others, look for synthesis, and work toward the best combined answer. Acknowledge strong points from other perspectives.";

  const memoryContext = params.memory
    ? `\n\nContext from previous conversations:\n${params.memory}\n\nUse this context as background knowledge when relevant, but focus on answering the current question.`
    : "";

  return `You are ${params.modelName}, participating in a group discussion with other AI models. ${styleInstruction}

Respond in ${params.language}. Be concise and substantive - aim for 150-300 words. Focus on your unique perspective and strongest arguments.${memoryContext}`;
}

export function buildDebatePrompt(params: {
  language: string;
  debateStyle: "collaborative" | "adversarial";
  modelName: string;
  round: number;
  previousResponses: { modelName: string; content: string }[];
}): string {
  const styleInstruction =
    params.debateStyle === "adversarial"
      ? "Challenge the other models' arguments. Point out flaws, present counterevidence, and defend your position if it was criticized."
      : "Build on the strongest ideas presented. If you agree with someone, add depth. If you disagree, explain why constructively and offer alternatives.";

  const othersText = params.previousResponses
    .map((r) => `**${r.modelName}** said:\n${r.content}`)
    .join("\n\n---\n\n");

  return `You are ${params.modelName} in round ${params.round} of a group discussion. Here is what the other models said in the previous round:

${othersText}

${styleInstruction}

Respond in ${params.language}. Be concise (100-200 words). Reference specific points from other models by name. Do not repeat what you said before - advance the discussion.`;
}

export function buildSummaryPrompt(params: {
  language: string;
  originalQuestion: string;
  fullConversation: string;
}): string {
  return `You are a neutral moderator. A user asked: "${params.originalQuestion}"

Multiple AI models discussed and debated this question. Here is the full conversation:

${params.fullConversation}

Write a structured summary in ${params.language} with exactly these sections:

## Summary

**Overview:** (1-2 sentences restating the question and what was discussed)

**Each Model's Position:**
(For each model, 2-3 bullet points capturing their key arguments)

**Points of Agreement:**
(Bullet points where models aligned)

**Points of Disagreement:**
(Bullet points where models differed, noting who said what)

**Conclusion:**
(A balanced 2-3 sentence conclusion synthesizing the best insights)

Be factual - only report what models actually said. Do not add your own opinions.`;
}
```

- [ ] **Step 2: Commit**

```bash
cd ~/multi-model-arena
git add src/lib/prompts.ts
git commit -m "feat: add debate and summary prompt templates"
```

---

## Task 9: Chat API Route (Streaming)

**Files:**
- Create: `src/app/api/chat/route.ts`

- [ ] **Step 1: Create the chat streaming API**

Create `src/app/api/chat/route.ts`:

```typescript
import { NextRequest } from "next/server";
import { readConfig } from "@/lib/config";
import { getProviderForModel } from "@/lib/providers";
import { buildInitialPrompt, buildDebatePrompt } from "@/lib/prompts";
import { readMemory } from "@/lib/memory";
import { isOverBudget } from "@/lib/usage";
import { ChatMessage } from "@/lib/providers/types";

export async function POST(request: NextRequest) {
  const {
    modelId,
    modelName,
    userMessage,
    language,
    round,
    previousResponses,
  } = await request.json();

  const config = readConfig();

  // Check spending limit
  if (isOverBudget(config.monthlySpendingLimit)) {
    const encoder = new TextEncoder();
    return new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: "Monthly budget reached. Adjust your limit in settings to continue." })}\n\n`
            )
          );
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        },
      }),
      {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      }
    );
  }

  // Get the provider for this model
  const provider = await getProviderForModel(modelId, config.providers);
  if (!provider) {
    const encoder = new TextEncoder();
    return new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: "No API key configured. Add your API key in settings." })}\n\n`
            )
          );
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        },
      }),
      {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      }
    );
  }

  // Build system prompt
  let systemPrompt: string;
  if (round === 1) {
    const memory = config.memoryEnabled ? readMemory() : "";
    systemPrompt = buildInitialPrompt({
      language,
      debateStyle: config.debateStyle,
      modelName,
      memory,
    });
  } else {
    systemPrompt = buildDebatePrompt({
      language,
      debateStyle: config.debateStyle,
      modelName,
      round,
      previousResponses: previousResponses || [],
    });
  }

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage },
  ];

  try {
    const response = await provider.chat({
      model: modelId,
      messages,
      temperature: config.temperature,
    });

    return new Response(response.stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const encoder = new TextEncoder();
    return new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: message })}\n\n`
            )
          );
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        },
      }),
      {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      }
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd ~/multi-model-arena
git add src/app/api/chat/route.ts
git commit -m "feat: add streaming chat API with budget checks and memory context"
```

---

## Task 10: Summarize API Route

**Files:**
- Create: `src/app/api/summarize/route.ts`

- [ ] **Step 1: Create the summarize API**

Create `src/app/api/summarize/route.ts`:

```typescript
import { NextRequest } from "next/server";
import { readConfig } from "@/lib/config";
import { getProviderForModel } from "@/lib/providers";
import { buildSummaryPrompt } from "@/lib/prompts";
import { ChatMessage } from "@/lib/providers/types";

export async function POST(request: NextRequest) {
  const { originalQuestion, fullConversation, language } =
    await request.json();

  const config = readConfig();
  const moderatorModel = config.moderatorModel;

  const provider = await getProviderForModel(moderatorModel, config.providers);
  if (!provider) {
    const encoder = new TextEncoder();
    return new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: "No API key configured for moderator model." })}\n\n`
            )
          );
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        },
      }),
      {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      }
    );
  }

  const systemPrompt = buildSummaryPrompt({
    language,
    originalQuestion,
    fullConversation,
  });

  const messages: ChatMessage[] = [
    { role: "user", content: systemPrompt },
  ];

  try {
    const response = await provider.chat({
      model: moderatorModel,
      messages,
      temperature: 0.3, // Lower temperature for factual summary
    });

    return new Response(response.stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const encoder = new TextEncoder();
    return new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: message })}\n\n`
            )
          );
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        },
      }),
      {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      }
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd ~/multi-model-arena
git add src/app/api/summarize/route.ts
git commit -m "feat: add moderator summary API with streaming"
```

---

## Task 11: Health Check API (Connection Status)

**Files:**
- Create: `src/app/api/health/route.ts`

- [ ] **Step 1: Create the health check API**

Create `src/app/api/health/route.ts`:

```typescript
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Check internet by pinging OpenRouter
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch("https://openrouter.ai/api/v1/models", {
      method: "HEAD",
      signal: controller.signal,
    });

    clearTimeout(timeout);

    return NextResponse.json({
      online: response.ok,
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({
      online: false,
      timestamp: new Date().toISOString(),
    });
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd ~/multi-model-arena
git add src/app/api/health/route.ts
git commit -m "feat: add health check endpoint for connection status"
```

---

## Task 12: UI Components - Reusable Primitives

**Files:**
- Create: `src/components/ui/Button.tsx`
- Create: `src/components/ui/Dialog.tsx`
- Create: `src/components/ui/Slider.tsx`

- [ ] **Step 1: Create the Button component**

Create `src/components/ui/Button.tsx`:

```tsx
"use client";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";

  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
    secondary:
      "bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500",
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
    ghost: "text-gray-600 hover:bg-gray-100 focus:ring-gray-500",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 2: Create the Dialog component**

Create `src/components/ui/Dialog.tsx`:

```tsx
"use client";

import { useEffect, useRef } from "react";
import { Button } from "./Button";

interface DialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmVariant?: "primary" | "danger";
  requireInput?: string; // If set, user must type this to confirm
  onConfirm: () => void;
  onCancel: () => void;
}

export function Dialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  confirmVariant = "primary",
  requireInput,
  onConfirm,
  onCancel,
}: DialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (open) {
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [open]);

  if (!open) return null;

  const handleConfirm = () => {
    if (requireInput && inputRef.current?.value !== requireInput) return;
    onConfirm();
  };

  return (
    <dialog
      ref={dialogRef}
      className="rounded-xl p-0 shadow-2xl backdrop:bg-black/50 max-w-md w-full"
      onClose={onCancel}
    >
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <p className="mt-2 text-sm text-gray-600">{message}</p>
        {requireInput && (
          <input
            ref={inputRef}
            type="text"
            placeholder={`Type "${requireInput}" to confirm`}
            className="mt-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        )}
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant={confirmVariant} onClick={handleConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
```

- [ ] **Step 3: Create the Slider component**

Create `src/components/ui/Slider.tsx`:

```tsx
"use client";

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  leftLabel?: string;
  rightLabel?: string;
  onChange: (value: number) => void;
}

export function Slider({
  label,
  value,
  min,
  max,
  step,
  leftLabel,
  rightLabel,
  onChange,
}: SliderProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <div className="flex items-center gap-3">
        {leftLabel && (
          <span className="text-xs text-gray-500 w-16">{leftLabel}</span>
        )}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
        />
        {rightLabel && (
          <span className="text-xs text-gray-500 w-16 text-right">
            {rightLabel}
          </span>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
cd ~/multi-model-arena
git add src/components/ui/
git commit -m "feat: add reusable UI components (Button, Dialog, Slider)"
```

---

## Task 13: UI - Chat Components

**Files:**
- Create: `src/components/ConnectionStatus.tsx`
- Create: `src/components/ChatMessage.tsx`
- Create: `src/components/SummaryMessage.tsx`
- Create: `src/components/ChatInput.tsx`
- Create: `src/components/ControlBar.tsx`
- Create: `src/components/ModelSelector.tsx`
- Create: `src/components/ChatArea.tsx`

- [ ] **Step 1: Create ConnectionStatus**

Create `src/components/ConnectionStatus.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";

export function ConnectionStatus() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch("/api/health");
        const data = await res.json();
        setOnline(data.online);
      } catch {
        setOnline(false);
      }
    };

    check();
    const interval = setInterval(check, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-2" title={online ? "Connected" : "No internet connection. Models cannot respond until connection is restored."}>
      <div
        className={`w-2.5 h-2.5 rounded-full ${
          online ? "bg-green-500" : "bg-red-500 animate-pulse"
        }`}
      />
      {!online && (
        <span className="text-xs text-red-600 font-medium">Offline</span>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create ChatMessage**

Create `src/components/ChatMessage.tsx`:

```tsx
"use client";

interface ChatMessageProps {
  role: "user" | "model" | "moderator";
  modelName?: string;
  color?: string;
  content: string;
  cost?: number;
  isStreaming?: boolean;
  error?: string;
}

export function ChatMessage({
  role,
  modelName,
  color,
  content,
  cost,
  isStreaming,
  error,
}: ChatMessageProps) {
  if (role === "user") {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-[70%] bg-blue-600 text-white rounded-2xl rounded-br-sm px-4 py-3">
          <p className="whitespace-pre-wrap">{content}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex mb-4">
        <div className="max-w-[70%] bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-3 h-3 rounded-full bg-gray-400"
            />
            <span className="text-sm font-medium text-gray-400">
              {modelName}
            </span>
          </div>
          <p className="text-gray-400 italic">{modelName} did not respond</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex mb-4">
      <div className="max-w-[70%] bg-gray-50 border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3">
        <div className="flex items-center gap-2 mb-1">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: color || "#6b7280" }}
          />
          <span
            className="text-sm font-semibold"
            style={{ color: color || "#6b7280" }}
          >
            {modelName}
          </span>
          {cost !== undefined && cost > 0 && (
            <span className="text-xs text-gray-400 ml-auto">
              ${cost.toFixed(4)}
            </span>
          )}
        </div>
        <div className="prose prose-sm max-w-none">
          <p className="whitespace-pre-wrap">{content}</p>
        </div>
        {isStreaming && (
          <span className="inline-block w-2 h-4 bg-gray-400 animate-pulse ml-1" />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create SummaryMessage**

Create `src/components/SummaryMessage.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button } from "./ui/Button";

interface SummaryMessageProps {
  content: string;
  moderatorName: string;
  isStreaming?: boolean;
}

export function SummaryMessage({
  content,
  moderatorName,
  isStreaming,
}: SummaryMessageProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mb-4 mx-4">
      <div className="bg-amber-50 border-2 border-amber-200 rounded-xl px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">&#9878;</span>
            <span className="text-sm font-semibold text-amber-800">
              Summary by {moderatorName}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="text-amber-700 hover:bg-amber-100"
          >
            {copied ? "Copied!" : "Copy Summary"}
          </Button>
        </div>
        <div className="prose prose-sm max-w-none prose-amber">
          <div className="whitespace-pre-wrap">{content}</div>
        </div>
        {isStreaming && (
          <span className="inline-block w-2 h-4 bg-amber-400 animate-pulse ml-1" />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create ChatInput**

Create `src/components/ChatInput.tsx`:

```tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "./ui/Button";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  disabled,
  placeholder = "Type your question...",
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [message]);

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setMessage("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-gray-200 bg-white px-4 py-3">
      <div className="flex items-end gap-3 max-w-4xl mx-auto">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
        />
        <Button
          onClick={handleSend}
          disabled={disabled || !message.trim()}
          size="lg"
          className="rounded-xl"
        >
          Send
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create ModelSelector**

Create `src/components/ModelSelector.tsx`:

```tsx
"use client";

import { ModelInfo } from "@/lib/models";

interface ModelSelectorProps {
  allModels: ModelInfo[];
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
  maxModels?: number;
}

export function ModelSelector({
  allModels,
  selectedIds,
  onChange,
  maxModels = 6,
}: ModelSelectorProps) {
  const toggle = (modelId: string) => {
    if (selectedIds.includes(modelId)) {
      onChange(selectedIds.filter((id) => id !== modelId));
    } else if (selectedIds.length < maxModels) {
      onChange([...selectedIds, modelId]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {allModels.map((model) => {
        const selected = selectedIds.includes(model.id);
        return (
          <button
            key={model.id}
            onClick={() => toggle(model.id)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
              selected
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: model.color }}
            />
            {model.name}
          </button>
        );
      })}
      {selectedIds.length >= maxModels && (
        <span className="text-xs text-gray-400 self-center">
          Max {maxModels} models
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Create ControlBar**

Create `src/components/ControlBar.tsx`:

```tsx
"use client";

import { Button } from "./ui/Button";
import { ModelSelector } from "./ModelSelector";
import { ModelInfo } from "@/lib/models";

interface ControlBarProps {
  round: number;
  maxRounds: number;
  estimatedCost: number;
  allModels: ModelInfo[];
  selectedModelIds: string[];
  onModelChange: (ids: string[]) => void;
  onKeepDebating: () => void;
  onSummarize: () => void;
  isLoading: boolean;
  conversationCost: number;
}

export function ControlBar({
  round,
  maxRounds,
  estimatedCost,
  allModels,
  selectedModelIds,
  onModelChange,
  onKeepDebating,
  onSummarize,
  isLoading,
  conversationCost,
}: ControlBarProps) {
  const canDebate = round < maxRounds;

  return (
    <div className="border-t border-gray-200 bg-gray-50 px-4 py-3">
      <div className="max-w-4xl mx-auto space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {canDebate && (
              <Button
                onClick={onKeepDebating}
                disabled={isLoading}
                variant="primary"
              >
                Keep Debating
              </Button>
            )}
            <Button
              onClick={onSummarize}
              disabled={isLoading}
              variant="secondary"
            >
              Summarize
            </Button>
          </div>
          <span className="text-sm text-gray-500">
            Round {round} of {maxRounds}
          </span>
        </div>

        {canDebate && (
          <div className="text-xs text-gray-500">
            <p>
              Estimated cost for next round: ~${estimatedCost.toFixed(3)}.{" "}
              <span className="text-amber-600">
                Note: the actual cost could be higher than this estimate,
                especially in later rounds.
              </span>
            </p>
          </div>
        )}

        {conversationCost >= 1 && (
          <div className="text-xs text-amber-600 font-medium">
            This conversation has used ${conversationCost.toFixed(2)} so far.
          </div>
        )}

        <ModelSelector
          allModels={allModels}
          selectedIds={selectedModelIds}
          onChange={onModelChange}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Create ChatArea**

Create `src/components/ChatArea.tsx`:

```tsx
"use client";

import { useRef, useEffect } from "react";
import { ChatMessage } from "./ChatMessage";
import { SummaryMessage } from "./SummaryMessage";

export interface Message {
  id: string;
  role: "user" | "model" | "moderator";
  modelName?: string;
  color?: string;
  content: string;
  cost?: number;
  isStreaming?: boolean;
  error?: string;
  round: number;
}

interface ChatAreaProps {
  messages: Message[];
  moderatorName?: string;
}

export function ChatArea({ messages, moderatorName }: ChatAreaProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="max-w-4xl mx-auto">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-20">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Multi-Model Arena
            </h2>
            <p className="text-gray-500 max-w-md">
              Ask a question and watch multiple AI models debate it.
              Get a summary of their best ideas.
            </p>
          </div>
        )}

        {messages.map((msg) => {
          if (msg.role === "moderator") {
            return (
              <SummaryMessage
                key={msg.id}
                content={msg.content}
                moderatorName={moderatorName || "Moderator"}
                isStreaming={msg.isStreaming}
              />
            );
          }

          return (
            <ChatMessage
              key={msg.id}
              role={msg.role}
              modelName={msg.modelName}
              color={msg.color}
              content={msg.content}
              cost={msg.cost}
              isStreaming={msg.isStreaming}
              error={msg.error}
            />
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Commit**

```bash
cd ~/multi-model-arena
git add src/components/
git commit -m "feat: add all chat UI components (messages, input, control bar, model selector)"
```

---

## Task 14: UI - Sidebar

**Files:**
- Create: `src/components/Sidebar.tsx`

- [ ] **Step 1: Create the Sidebar**

Create `src/components/Sidebar.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button } from "./ui/Button";
import { Dialog } from "./ui/Dialog";
import { ConversationMeta } from "@/lib/conversations";

interface SidebarProps {
  conversations: ConversationMeta[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onOpenSettings: () => void;
}

export function Sidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  onOpenSettings,
}: SidebarProps) {
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  return (
    <>
      <div className="w-72 bg-gray-50 border-r border-gray-200 flex flex-col h-full">
        <div className="p-4 border-b border-gray-200">
          <Button onClick={onNew} className="w-full" variant="primary">
            + New Conversation
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className={`group flex items-center px-4 py-3 cursor-pointer hover:bg-gray-100 ${
                activeId === conv.id ? "bg-blue-50 border-r-2 border-blue-600" : ""
              }`}
              onClick={() => onSelect(conv.id)}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {conv.title}
                </p>
                <p className="text-xs text-gray-500">{conv.date}</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteTarget(conv.id);
                }}
                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 ml-2 p-1"
                title="Delete conversation"
              >
                &#x2715;
              </button>
            </div>
          ))}

          {conversations.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8 px-4">
              No conversations yet. Start one!
            </p>
          )}
        </div>

        <div className="p-4 border-t border-gray-200">
          <button
            onClick={onOpenSettings}
            className="w-full text-left text-sm text-gray-600 hover:text-gray-900 px-2 py-1.5 rounded hover:bg-gray-100"
          >
            Settings
          </button>
        </div>
      </div>

      <Dialog
        open={!!deleteTarget}
        title="Delete conversation?"
        message="This cannot be undone."
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={() => {
          if (deleteTarget) onDelete(deleteTarget);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd ~/multi-model-arena
git add src/components/Sidebar.tsx
git commit -m "feat: add sidebar with conversation history and delete"
```

---

## Task 15: UI - Setup Wizard

**Files:**
- Create: `src/components/SetupWizard.tsx`

- [ ] **Step 1: Create the Setup Wizard**

Create `src/components/SetupWizard.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button } from "./ui/Button";

interface SetupWizardProps {
  onComplete: () => void;
}

export function SetupWizard({ onComplete }: SetupWizardProps) {
  const [apiKey, setApiKey] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!apiKey.trim()) return;
    setIsValidating(true);
    setError("");

    try {
      const res = await fetch("/api/keys", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId: "openrouter", apiKey: apiKey.trim() }),
      });

      if (!res.ok) {
        setError("Failed to save API key. Please try again.");
        return;
      }

      onComplete();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-white flex items-center justify-center">
      <div className="max-w-md w-full px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome to Multi-Model Arena
        </h1>
        <p className="text-gray-600 mb-8">
          Ask a question and watch AI models debate it. To get started, paste
          your OpenRouter API key below.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              OpenRouter API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-or-..."
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button
            onClick={handleSubmit}
            disabled={!apiKey.trim() || isValidating}
            className="w-full"
            size="lg"
          >
            {isValidating ? "Saving..." : "Get Started"}
          </Button>

          <p className="text-xs text-gray-400 text-center">
            Your key is stored securely in your system keychain. It never leaves
            your computer except to call the AI providers.
          </p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd ~/multi-model-arena
git add src/components/SetupWizard.tsx
git commit -m "feat: add first-time setup wizard for API key entry"
```

---

## Task 16: Main Page - Wire Everything Together

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Update the root layout**

Replace `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Multi-Model Arena",
  description: "AI models debate your questions",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
```

- [ ] **Step 2: Build the main page**

Replace `src/app/page.tsx` with the full wired-up main page. This is the largest file - it orchestrates all the components and manages the chat state.

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { Sidebar } from "@/components/Sidebar";
import { ChatArea, Message } from "@/components/ChatArea";
import { ChatInput } from "@/components/ChatInput";
import { ControlBar } from "@/components/ControlBar";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import { SetupWizard } from "@/components/SetupWizard";
import { DEFAULT_MODELS, getModelInfo } from "@/lib/models";
import { ConversationMeta } from "@/lib/conversations";

type Phase = "idle" | "responding" | "debating" | "summarizing";

export default function Home() {
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [conversations, setConversations] = useState<ConversationMeta[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [userQuestion, setUserQuestion] = useState("");
  const [language, setLanguage] = useState("English");
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [conversationCost, setConversationCost] = useState(0);

  // Check for API key on load
  useEffect(() => {
    fetch("/api/keys?providerId=openrouter")
      .then((r) => r.json())
      .then((data) => setHasApiKey(data.hasKey))
      .catch(() => setHasApiKey(false));
  }, []);

  // Load config defaults
  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((config) => {
        setSelectedModelIds(config.defaultModels);
      })
      .catch(() => {
        setSelectedModelIds(DEFAULT_MODELS.slice(0, 4).map((m) => m.id));
      });
  }, []);

  // Load conversations list
  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations");
      const data = await res.json();
      setConversations(data);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (hasApiKey) loadConversations();
  }, [hasApiKey, loadConversations]);

  const streamModelResponse = async (
    modelId: string,
    modelName: string,
    color: string,
    question: string,
    currentRound: number,
    previousResponses: { modelName: string; content: string }[]
  ): Promise<{ content: string; error?: string }> => {
    const msgId = `${modelId}-${currentRound}-${Date.now()}`;

    setMessages((prev) => [
      ...prev,
      {
        id: msgId,
        role: "model",
        modelName,
        color,
        content: "",
        round: currentRound,
        isStreaming: true,
      },
    ]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelId,
          modelName,
          userMessage: question,
          language,
          round: currentRound,
          previousResponses,
        }),
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.error) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === msgId
                    ? { ...m, error: parsed.error, isStreaming: false }
                    : m
                )
              );
              return { content: "", error: parsed.error };
            }
            if (parsed.content) {
              fullContent += parsed.content;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === msgId ? { ...m, content: fullContent } : m
                )
              );
            }
          } catch {
            // ignore parse errors
          }
        }
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId ? { ...m, isStreaming: false } : m
        )
      );

      return { content: fullContent };
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? { ...m, error: "Failed to connect", isStreaming: false }
            : m
        )
      );
      return { content: "", error: "Failed to connect" };
    }
  };

  const handleSend = async (question: string) => {
    setPhase("responding");
    setUserQuestion(question);
    setRound(1);
    setConversationCost(0);

    // Add user message
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: question,
      round: 0,
    };
    setMessages([userMsg]);

    // Detect language (simple client-side check for now)
    const detectedLang = /[\u4e00-\u9fff]/.test(question)
      ? "Chinese"
      : /[\u3040-\u309f\u30a0-\u30ff]/.test(question)
        ? "Japanese"
        : /[\uac00-\ud7af]/.test(question)
          ? "Korean"
          : "English";
    setLanguage(detectedLang);

    // Stream all model responses
    const responses: { modelName: string; content: string }[] = [];

    for (const modelId of selectedModelIds) {
      const info = getModelInfo(modelId);
      const result = await streamModelResponse(
        modelId,
        info.name,
        info.color,
        question,
        1,
        []
      );
      if (result.content) {
        responses.push({ modelName: info.name, content: result.content });
      }
    }

    setPhase("idle");
  };

  const handleKeepDebating = async () => {
    const nextRound = round + 1;
    setRound(nextRound);
    setPhase("debating");

    // Gather previous round's responses
    const previousResponses = messages
      .filter((m) => m.role === "model" && m.round === round && !m.error)
      .map((m) => ({ modelName: m.modelName!, content: m.content }));

    for (const modelId of selectedModelIds) {
      const info = getModelInfo(modelId);
      await streamModelResponse(
        modelId,
        info.name,
        info.color,
        userQuestion,
        nextRound,
        previousResponses
      );
    }

    setPhase("idle");
  };

  const handleSummarize = async () => {
    setPhase("summarizing");

    // Build full conversation text
    const conversationText = messages
      .filter((m) => m.role !== "moderator")
      .map((m) => {
        if (m.role === "user") return `**User:** ${m.content}`;
        return `**${m.modelName}** (Round ${m.round}): ${m.content}`;
      })
      .join("\n\n");

    const msgId = `summary-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: msgId,
        role: "moderator",
        content: "",
        round: 0,
        isStreaming: true,
      },
    ]);

    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalQuestion: userQuestion,
          fullConversation: conversationText,
          language,
        }),
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              fullContent += parsed.content;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === msgId ? { ...m, content: fullContent } : m
                )
              );
            }
          } catch {
            // ignore
          }
        }
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId ? { ...m, isStreaming: false } : m
        )
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? { ...m, content: "Failed to generate summary.", isStreaming: false }
            : m
        )
      );
    }

    setPhase("idle");
  };

  const handleNewConversation = () => {
    setMessages([]);
    setRound(0);
    setPhase("idle");
    setActiveConversationId(null);
    setUserQuestion("");
    setConversationCost(0);
  };

  const handleDeleteConversation = async (id: string) => {
    await fetch("/api/conversations", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (activeConversationId === id) handleNewConversation();
    loadConversations();
  };

  // Show loading while checking API key
  if (hasApiKey === null) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    );
  }

  // Show setup wizard if no API key
  if (!hasApiKey) {
    return (
      <SetupWizard
        onComplete={() => {
          setHasApiKey(true);
          loadConversations();
        }}
      />
    );
  }

  const showControlBar = round > 0 && phase === "idle";

  return (
    <div className="h-screen flex">
      <Sidebar
        conversations={conversations}
        activeId={activeConversationId}
        onSelect={(id) => setActiveConversationId(id)}
        onNew={handleNewConversation}
        onDelete={handleDeleteConversation}
        onOpenSettings={() => (window.location.href = "/settings")}
      />

      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-end px-4 py-2 border-b border-gray-200">
          <ConnectionStatus />
        </div>

        <ChatArea
          messages={messages}
          moderatorName="Gemini Flash"
        />

        {showControlBar && (
          <ControlBar
            round={round}
            maxRounds={10}
            estimatedCost={estimatedCost}
            allModels={DEFAULT_MODELS}
            selectedModelIds={selectedModelIds}
            onModelChange={setSelectedModelIds}
            onKeepDebating={handleKeepDebating}
            onSummarize={handleSummarize}
            isLoading={phase !== "idle"}
            conversationCost={conversationCost}
          />
        )}

        <ChatInput
          onSend={handleSend}
          disabled={phase !== "idle" || round > 0}
          placeholder={
            round > 0
              ? "Use the controls above to continue the debate or summarize"
              : "Type your question..."
          }
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify the app compiles**

```bash
cd ~/multi-model-arena
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
cd ~/multi-model-arena
git add src/app/page.tsx src/app/layout.tsx
git commit -m "feat: wire up main page with chat, sidebar, control bar, and setup wizard"
```

---

## Task 17: Settings Page

**Files:**
- Create: `src/app/settings/page.tsx`

- [ ] **Step 1: Build the settings page**

Create `src/app/settings/page.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Slider } from "@/components/ui/Slider";
import { Dialog } from "@/components/ui/Dialog";
import { DEFAULT_MODELS } from "@/lib/models";
import { AppConfig } from "@/lib/config";

export default function SettingsPage() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then(setConfig);
  }, []);

  const save = async (updates: Partial<AppConfig>) => {
    setSaving(true);
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    const updated = await res.json();
    setConfig(updated);
    setSaving(false);
  };

  const handleClearAll = async () => {
    await fetch("/api/conversations", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clearAll: true, confirmation: "DELETE ALL" }),
    });
    setShowClearDialog(false);
  };

  if (!config) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <Button
            variant="ghost"
            onClick={() => (window.location.href = "/")}
          >
            Back to Chat
          </Button>
        </div>

        <div className="space-y-8">
          {/* API Providers */}
          <section className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              API Providers
            </h2>
            <div className="space-y-3">
              {config.providers.map((provider) => (
                <div
                  key={provider.id}
                  className="flex items-center justify-between py-2"
                >
                  <div>
                    <p className="font-medium text-gray-900">{provider.name}</p>
                    <p className="text-xs text-gray-500">{provider.baseUrl}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-xs text-gray-500">Connected</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Default Models */}
          <section className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Default Models (max 6)
            </h2>
            <div className="space-y-2">
              {DEFAULT_MODELS.map((model) => (
                <label
                  key={model.id}
                  className="flex items-center gap-3 py-1 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={config.defaultModels.includes(model.id)}
                    onChange={(e) => {
                      const newModels = e.target.checked
                        ? [...config.defaultModels, model.id].slice(0, 6)
                        : config.defaultModels.filter((id) => id !== model.id);
                      save({ defaultModels: newModels });
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: model.color }}
                  />
                  <span className="text-sm text-gray-900">{model.name}</span>
                </label>
              ))}
            </div>
          </section>

          {/* Moderator */}
          <section className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Moderator Model
            </h2>
            <select
              value={config.moderatorModel}
              onChange={(e) => save({ moderatorModel: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              {DEFAULT_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </section>

          {/* Debate Style */}
          <section className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Debate Style
            </h2>
            <div className="flex gap-3">
              {(["collaborative", "adversarial"] as const).map((style) => (
                <button
                  key={style}
                  onClick={() => save({ debateStyle: style })}
                  className={`flex-1 rounded-lg px-4 py-3 text-sm font-medium transition-all ${
                    config.debateStyle === style
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {style === "collaborative" ? "Collaborative" : "Adversarial"}
                  <p className="text-xs mt-1 opacity-80">
                    {style === "collaborative"
                      ? "Models build on each other"
                      : "Models challenge each other"}
                  </p>
                </button>
              ))}
            </div>
          </section>

          {/* Temperature */}
          <section className="bg-white rounded-xl p-6 shadow-sm">
            <Slider
              label="Temperature"
              value={config.temperature}
              min={0}
              max={1}
              step={0.1}
              leftLabel="Focused"
              rightLabel="Creative"
              onChange={(v) => save({ temperature: v })}
            />
          </section>

          {/* Spending Limit */}
          <section className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Monthly Spending Limit
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-gray-500">$</span>
              <input
                type="number"
                value={config.monthlySpendingLimit}
                onChange={(e) =>
                  save({
                    monthlySpendingLimit: parseFloat(e.target.value) || 0,
                  })
                }
                min={1}
                className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
              <span className="text-sm text-gray-500">per month</span>
            </div>
          </section>

          {/* Conversation Memory */}
          <section className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Conversation Memory
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Models remember context from your recent conversations
                </p>
              </div>
              <button
                onClick={() => save({ memoryEnabled: !config.memoryEnabled })}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  config.memoryEnabled ? "bg-blue-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                    config.memoryEnabled ? "translate-x-5" : ""
                  }`}
                />
              </button>
            </div>
          </section>

          {/* Conversations Folder */}
          <section className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Conversations Folder
            </h2>
            <input
              type="text"
              value={config.conversationsFolder}
              onChange={(e) =>
                save({ conversationsFolder: e.target.value })
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none"
            />
            <p className="text-xs text-gray-500 mt-2">
              Markdown files are saved here. Change this to your Obsidian vault
              if you want.
            </p>
          </section>

          {/* Danger Zone */}
          <section className="bg-white rounded-xl p-6 shadow-sm border border-red-200">
            <h2 className="text-lg font-semibold text-red-600 mb-4">
              Danger Zone
            </h2>
            <Button
              variant="danger"
              onClick={() => setShowClearDialog(true)}
            >
              Clear All Conversation History
            </Button>
          </section>
        </div>

        {saving && (
          <div className="fixed bottom-4 right-4 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg">
            Saved
          </div>
        )}
      </div>

      <Dialog
        open={showClearDialog}
        title="Clear all conversation history?"
        message="This will permanently delete all your conversation files. This cannot be undone."
        confirmLabel="Clear All"
        confirmVariant="danger"
        requireInput="DELETE ALL"
        onConfirm={handleClearAll}
        onCancel={() => setShowClearDialog(false)}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify settings page loads**

```bash
cd ~/multi-model-arena
npm run dev
```

Visit `http://localhost:3000/settings` - should show all settings sections.

- [ ] **Step 3: Commit**

```bash
cd ~/multi-model-arena
git add src/app/settings/
git commit -m "feat: add settings page with all configuration options"
```

---

## Task 18: Markdown Save Integration

Wire the chat flow to actually save conversations as markdown files after each round.

**Files:**
- Modify: `src/app/page.tsx` (add save calls)

- [ ] **Step 1: Add save-to-markdown after responses complete**

Add these functions to `src/app/page.tsx` inside the `Home` component, and call them at the end of `handleSend`, `handleKeepDebating`, and `handleSummarize`:

After the response loop in `handleSend`, add:

```typescript
// Save conversation to markdown
const createRes = await fetch("/api/conversations/create", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    title: question,
    models: selectedModelIds.map((id) => getModelInfo(id).name),
    language: detectedLang,
    responses: responses.map((r) => ({
      modelName: r.modelName,
      content: r.content,
    })),
  }),
});
const { id } = await createRes.json();
setActiveConversationId(id);
loadConversations();
```

- [ ] **Step 2: Create the conversation create API**

Create `src/app/api/conversations/create/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import {
  createConversation,
  appendToConversation,
  updateRoundCount,
} from "@/lib/conversations";

export async function POST(request: NextRequest) {
  const { title, models, language, responses, conversationId, round, summary, moderatorName } =
    await request.json();

  // Create new conversation
  if (!conversationId) {
    const id = createConversation(title, models, language);

    let content = "\n## Round 1 - Initial Responses\n\n";
    for (const r of responses) {
      content += `### ${r.modelName}\n${r.content}\n\n`;
    }

    appendToConversation(id, content);
    updateRoundCount(id, 1);

    return NextResponse.json({ id });
  }

  // Append debate round
  if (round && responses) {
    let content = `\n## Round ${round} - Debate\n\n`;
    for (const r of responses) {
      content += `### ${r.modelName}\n${r.content}\n\n`;
    }
    appendToConversation(conversationId, content);
    updateRoundCount(conversationId, round);
    return NextResponse.json({ success: true });
  }

  // Append summary
  if (summary) {
    const content = `\n## Summary (by ${moderatorName})\n\n${summary}\n`;
    appendToConversation(conversationId, content);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}
```

- [ ] **Step 3: Commit**

```bash
cd ~/multi-model-arena
git add src/app/api/conversations/create/ src/app/page.tsx
git commit -m "feat: save conversations to markdown files after each round"
```

---

## Task 19: Full Integration Test

- [ ] **Step 1: Start the app**

```bash
cd ~/multi-model-arena
npm run dev
```

- [ ] **Step 2: Test the full flow manually**

1. Open `http://localhost:3000`
2. Should see Setup Wizard (no API key yet)
3. Enter your OpenRouter API key and click "Get Started"
4. Type a question like "What's the best programming language for beginners?"
5. Watch 4 models respond one by one
6. Click "Keep Debating" - models should debate
7. Click "Summarize" - moderator should summarize
8. Click "Copy Summary" - should copy to clipboard
9. Check `~/multi-model-arena/conversations/` for the markdown file
10. Open the markdown file in a text editor - should be readable
11. Go to Settings - verify all options work
12. Check the connection status dot (should be green)

- [ ] **Step 3: Fix any issues found during testing**

Address any bugs, styling issues, or broken flows.

- [ ] **Step 4: Commit all fixes**

```bash
cd ~/multi-model-arena
git add -A
git commit -m "fix: integration test fixes"
```

---

## Task 20: Final Polish

- [ ] **Step 1: Add a startup script to package.json**

Edit `package.json` to add a simple start command:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "arena": "next dev --port 3000 && open http://localhost:3000"
  }
}
```

- [ ] **Step 2: Update .gitignore to exclude conversations**

Add to `.gitignore`:

```
conversations/
```

- [ ] **Step 3: Final commit**

```bash
cd ~/multi-model-arena
git add -A
git commit -m "feat: Multi-Model Arena v1 complete"
```

- [ ] **Step 4: Verify clean start**

```bash
cd ~/multi-model-arena
npm run dev
```

Open `http://localhost:3000` - the full app should work end to end.
