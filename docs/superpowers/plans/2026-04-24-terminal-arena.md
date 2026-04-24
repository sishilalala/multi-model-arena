# Terminal Arena Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the web-based Multi-Model Arena with a rich terminal UI that reuses all existing backend logic from `src/lib/`.

**Architecture:** Ink (React for terminals) renders the UI. The CLI entry point imports `src/lib/` modules directly - no HTTP server, no API routes. Provider streaming is consumed via async iterators and piped into React state. The app is installed globally via npm and launched with the `arena` command.

**Tech Stack:** Ink 5, React 18, TypeScript, keytar (keychain), `src/lib/*` (existing backend)

---

## File Structure

```
multi-model-arena/
├── src/
│   ├── lib/                    # UNCHANGED - all backend logic
│   └── terminal/               # NEW - terminal UI
│       ├── index.tsx            # Entry point: render <App />
│       ├── App.tsx              # Screen router (setup / chat / settings)
│       ├── screens/
│       │   ├── SetupScreen.tsx  # First-time API key entry
│       │   ├── ChatScreen.tsx   # Main chat with sidebar + messages
│       │   └── SettingsScreen.tsx # Full settings UI
│       ├── components/
│       │   ├── Sidebar.tsx      # Conversation history panel
│       │   ├── ChatArea.tsx     # Scrollable message list
│       │   ├── MessageBubble.tsx # Single model response with color
│       │   ├── SummaryBox.tsx   # Gold-bordered summary display
│       │   ├── ControlBar.tsx   # Round counter + D/S/M shortcuts
│       │   ├── InputBar.tsx     # Text input at bottom
│       │   ├── ModelPicker.tsx  # Checkbox model selector overlay
│       │   ├── StatusDot.tsx    # Online/offline indicator
│       │   └── ConfirmDialog.tsx # Yes/No confirmation overlay
│       ├── hooks/
│       │   ├── useChat.ts       # All chat state + streaming logic
│       │   ├── useConversations.ts # Load/select/delete conversations
│       │   └── useConnection.ts # Poll /api/health equivalent
│       └── theme.ts             # Color constants
├── bin/
│   └── arena.js                 # #!/usr/bin/env node entry
├── Arena.app/                   # macOS desktop launcher
│   └── Contents/
│       ├── MacOS/
│       │   └── arena-launcher.sh
│       └── Info.plist
├── package.json
└── tsconfig.json
```

---

### Task 1: Strip Web Frontend, Reconfigure for Ink

**Files:**
- Delete: `src/app/` (all web pages + API routes)
- Delete: `src/components/` (all web React components)
- Modify: `package.json`
- Modify: `tsconfig.json`
- Create: `src/terminal/theme.ts`
- Create: `src/terminal/index.tsx`
- Create: `bin/arena.js`

- [ ] **Step 1: Remove web frontend files**

```bash
cd ~/multi-model-arena
rm -rf src/app src/components
rm -f postcss.config.mjs eslint.config.mjs next.config.ts next-env.d.ts
```

- [ ] **Step 2: Uninstall web dependencies, install terminal dependencies**

```bash
cd ~/multi-model-arena
npm uninstall next react react-dom @types/react @types/react-dom @tailwindcss/postcss tailwindcss eslint eslint-config-next react-markdown
npm install ink@5 ink-text-input@6 ink-spinner@5 ink-select-input@6 react@18 react-dom@18 clipboardy@4
npm install -D @types/react@18 tsx
```

- [ ] **Step 3: Update package.json**

Replace the `scripts` and add `bin` field:

```json
{
  "name": "multi-model-arena",
  "version": "2.0.0",
  "description": "Multiple AI models debate each other in your terminal",
  "type": "module",
  "bin": {
    "arena": "./bin/arena.js"
  },
  "scripts": {
    "start": "tsx src/terminal/index.tsx",
    "dev": "tsx watch src/terminal/index.tsx",
    "build": "tsc",
    "link": "npm link"
  },
  "dependencies": {
    "ink": "^5.0.0",
    "ink-text-input": "^6.0.0",
    "ink-spinner": "^5.0.0",
    "ink-select-input": "^6.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "keytar": "^7.9.0",
    "openai": "^6.34.0",
    "slugify": "^1.6.9",
    "clipboardy": "^4.0.0"
  },
  "devDependencies": {
    "@types/react": "^18",
    "@types/node": "^20",
    "tsx": "^4.0.0",
    "typescript": "^5"
  }
}
```

- [ ] **Step 4: Update tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    },
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 5: Create theme constants**

Create `src/terminal/theme.ts`:

```typescript
export const COLORS = {
  bg: "#1a1a1a",
  sidebarBg: "#2a2a2a",
  border: "#444444",
  dimText: "#666666",
  inputBorder: "#555555",
  inputFocusBorder: "#888888",
  userMessage: "white",
  summaryBorder: "#FFD700",
  summaryText: "#FFD700",
} as const;

export const MODEL_COLORS: Record<string, string> = {
  "anthropic/claude-opus-4-6": "#FF9500",
  "openai/gpt-5.4": "#00FF88",
  "google/gemini-3.1-pro-preview": "#00AAFF",
  "google/gemini-2.5-flash": "#00AAFF",
  "deepseek/deepseek-r1": "#FF4444",
  "xiaomi/mimo-v2-pro": "#FF66FF",
  "qwen/qwen3.6-plus": "#AA88FF",
  "moonshotai/kimi-k2.6": "#00DDDD",
  "bytedance-seed/seed-2.0-pro": "#FFDD00",
};

// Fallback colors for custom models
export const FALLBACK_COLORS = [
  "#FF9500", "#00FF88", "#00AAFF", "#FF4444",
  "#FF66FF", "#AA88FF", "#00DDDD", "#FFDD00",
];

export function getModelColor(modelId: string, customColor?: string): string {
  if (customColor) return customColor;
  return MODEL_COLORS[modelId] || FALLBACK_COLORS[Math.abs(hashCode(modelId)) % FALLBACK_COLORS.length];
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}
```

- [ ] **Step 6: Create the entry point**

Create `src/terminal/index.tsx`:

```tsx
#!/usr/bin/env node
import React from "react";
import { render } from "ink";
import { App } from "./App.js";

render(<App />);
```

- [ ] **Step 7: Create the CLI bin file**

Create `bin/arena.js`:

```javascript
#!/usr/bin/env node
import("tsx/esm/api").then(({ register }) => {
  register();
  import("../src/terminal/index.tsx");
});
```

- [ ] **Step 8: Fix src/lib imports for ESM**

The `src/lib/` files use bare imports like `import { readConfig } from "@/lib/config"`. With tsx + paths, these should resolve. Verify:

```bash
cd ~/multi-model-arena
npx tsx src/terminal/index.tsx
```

If path aliases don't resolve, add a `tsx` loader config or switch to relative imports in the terminal code.

- [ ] **Step 9: Commit**

```bash
cd ~/multi-model-arena
git add -A
git commit -m "feat: strip web frontend, set up Ink terminal framework"
```

---

### Task 2: App Shell and Screen Router

**Files:**
- Create: `src/terminal/App.tsx`
- Create: `src/terminal/screens/SetupScreen.tsx`

- [ ] **Step 1: Create the App shell with screen routing**

Create `src/terminal/App.tsx`:

```tsx
import React, { useState, useEffect } from "react";
import { Box, Text, useApp } from "ink";
import keytar from "keytar";
import { SetupScreen } from "./screens/SetupScreen.js";
import { ChatScreen } from "./screens/ChatScreen.js";
import { SettingsScreen } from "./screens/SettingsScreen.js";

type Screen = "loading" | "setup" | "chat" | "settings";

export function App() {
  const { exit } = useApp();
  const [screen, setScreen] = useState<Screen>("loading");

  useEffect(() => {
    async function checkKey() {
      const key = await keytar.getPassword("multi-model-arena", "openrouter");
      setScreen(key ? "chat" : "setup");
    }
    checkKey();
  }, []);

  if (screen === "loading") {
    return (
      <Box justifyContent="center" alignItems="center" height="100%">
        <Text color="gray">Loading...</Text>
      </Box>
    );
  }

  if (screen === "setup") {
    return <SetupScreen onComplete={() => setScreen("chat")} />;
  }

  if (screen === "settings") {
    return <SettingsScreen onBack={() => setScreen("chat")} />;
  }

  return (
    <ChatScreen
      onOpenSettings={() => setScreen("settings")}
      onQuit={() => exit()}
    />
  );
}
```

- [ ] **Step 2: Create the Setup screen**

Create `src/terminal/screens/SetupScreen.tsx`:

```tsx
import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import keytar from "keytar";
import { COLORS } from "../theme.js";

interface SetupScreenProps {
  onComplete: () => void;
}

export function SetupScreen({ onComplete }: SetupScreenProps) {
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useInput((input, key) => {
    if (key.escape || (input === "q" && !apiKey)) {
      process.exit(0);
    }
  });

  async function handleSubmit(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;

    setSaving(true);
    setError("");

    try {
      await keytar.setPassword("multi-model-arena", "openrouter", trimmed);
      onComplete();
    } catch (err) {
      setError("Failed to save key. Try again.");
      setSaving(false);
    }
  }

  return (
    <Box
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      height="100%"
    >
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor={COLORS.border}
        paddingX={4}
        paddingY={2}
        width={50}
        gap={1}
      >
        <Text bold color={COLORS.summaryText}>
          ⚔ Multi-Model Arena
        </Text>
        <Text color={COLORS.dimText}>
          Paste your OpenRouter API key to start.
        </Text>
        <Box marginTop={1}>
          <Text>Key: </Text>
          <TextInput
            value={apiKey}
            onChange={setApiKey}
            onSubmit={handleSubmit}
            mask="●"
            placeholder="sk-or-..."
          />
        </Box>
        {error && <Text color="red">{error}</Text>}
        {saving && <Text color={COLORS.dimText}>Saving...</Text>}
        <Text color={COLORS.dimText} dimColor>
          Enter to save • Q to quit
        </Text>
      </Box>
    </Box>
  );
}
```

- [ ] **Step 3: Create placeholder screens**

Create `src/terminal/screens/ChatScreen.tsx`:

```tsx
import React from "react";
import { Box, Text } from "ink";

interface ChatScreenProps {
  onOpenSettings: () => void;
  onQuit: () => void;
}

export function ChatScreen({ onOpenSettings, onQuit }: ChatScreenProps) {
  return (
    <Box flexDirection="column" height="100%">
      <Text>Chat screen placeholder - will be built in Task 5</Text>
    </Box>
  );
}
```

Create `src/terminal/screens/SettingsScreen.tsx`:

```tsx
import React from "react";
import { Box, Text, useInput } from "ink";

interface SettingsScreenProps {
  onBack: () => void;
}

export function SettingsScreen({ onBack }: SettingsScreenProps) {
  useInput((input, key) => {
    if (key.escape) onBack();
  });

  return (
    <Box flexDirection="column" height="100%">
      <Text>Settings placeholder - will be built in Task 9</Text>
      <Text color="gray">Press Esc to go back</Text>
    </Box>
  );
}
```

- [ ] **Step 4: Test the app launches**

```bash
cd ~/multi-model-arena
npx tsx src/terminal/index.tsx
```

Expected: Shows the setup screen if no key, or the chat placeholder if key exists.

- [ ] **Step 5: Commit**

```bash
cd ~/multi-model-arena
git add src/terminal/
git commit -m "feat: add app shell with screen routing and setup screen"
```

---

### Task 3: useChat Hook (Core Logic)

**Files:**
- Create: `src/terminal/hooks/useChat.ts`

- [ ] **Step 1: Create the chat hook**

This is the core logic that manages chat state, streams model responses in parallel, and handles debate rounds. It imports directly from `src/lib/`.

Create `src/terminal/hooks/useChat.ts`:

```typescript
import { useState, useRef, useCallback } from "react";
import { readConfig } from "../../lib/config.js";
import { getModelInfo, getAllModels } from "../../lib/models.js";
import { getProviderForModel } from "../../lib/providers/index.js";
import { buildInitialPrompt, buildDebatePrompt, buildSummaryPrompt } from "../../lib/prompts.js";
import { readMemory, updateMemory } from "../../lib/memory.js";
import { detectLanguage } from "../../lib/language.js";
import type { Language } from "../../lib/language.js";
import {
  createConversation,
  appendToConversation,
  updateRoundCount,
} from "../../lib/conversations.js";
import type { ChatMessage as ProviderMessage } from "../../lib/providers/types.js";

export interface ChatMessage {
  id: string;
  role: "user" | "model" | "moderator";
  modelId?: string;
  modelName?: string;
  content: string;
  error?: boolean;
  streaming?: boolean;
}

type Phase = "idle" | "responding" | "debating" | "summarizing";

let msgCounter = 0;
function nextId(): string {
  return `msg-${++msgCounter}-${Date.now()}`;
}

const MODEL_TIMEOUT_MS = 90_000;

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [userQuestion, setUserQuestion] = useState("");
  const [language, setLanguage] = useState<Language>("English");
  const [hasSummary, setHasSummary] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);
  const [streamingProgress, setStreamingProgress] = useState("");

  const messagesRef = useRef<ChatMessage[]>([]);
  messagesRef.current = messages;

  const streamModelResponse = useCallback(
    async (
      modelId: string,
      question: string,
      currentRound: number,
      previousResponses: { modelName: string; content: string }[]
    ): Promise<{ content: string; error?: boolean }> => {
      const config = readConfig();
      const modelInfo = getModelInfo(modelId, config.customModels);
      const msgId = nextId();

      setMessages((prev) => [
        ...prev,
        {
          id: msgId,
          role: "model",
          modelId,
          modelName: modelInfo.name,
          content: "",
          streaming: true,
        },
      ]);

      const provider = await getProviderForModel(
        modelId,
        config.providers,
        config.customModels
      );
      if (!provider) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId
              ? { ...m, content: "No API key configured", streaming: false, error: true }
              : m
          )
        );
        return { content: "", error: true };
      }

      // Build system prompt
      let systemPrompt: string;
      if (currentRound === 1) {
        const memory = config.memoryEnabled ? readMemory() : "";
        systemPrompt = buildInitialPrompt({
          language,
          debateStyle: config.debateStyle,
          modelName: modelInfo.name,
          memory,
        });
      } else {
        systemPrompt = buildDebatePrompt({
          language,
          debateStyle: config.debateStyle,
          modelName: modelInfo.name,
          round: currentRound,
          previousResponses,
        });
      }

      const providerMessages: ProviderMessage[] = [
        { role: "system", content: systemPrompt },
        { role: "user", content: question },
      ];

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), MODEL_TIMEOUT_MS);

        const response = await provider.chat({
          model: modelId,
          messages: providerMessages,
          temperature: config.temperature,
        });

        const reader = response.stream.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";
        let errorOccurred = false;
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") break;

            try {
              const parsed = JSON.parse(data);
              if (parsed.error) {
                errorOccurred = true;
                accumulated = parsed.error;
              } else if (parsed.content) {
                accumulated += parsed.content;
              }
            } catch {
              // skip
            }
          }

          setMessages((prev) =>
            prev.map((m) =>
              m.id === msgId ? { ...m, content: accumulated } : m
            )
          );
        }

        clearTimeout(timeoutId);

        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId
              ? { ...m, content: accumulated, streaming: false, error: errorOccurred }
              : m
          )
        );

        return { content: accumulated, error: errorOccurred };
      } catch (err) {
        const isTimeout = err instanceof DOMException && err.name === "AbortError";
        const errMsg = isTimeout
          ? "Timed out (90s)"
          : err instanceof Error ? err.message : "An error occurred";

        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId
              ? { ...m, content: errMsg, streaming: false, error: true }
              : m
          )
        );
        return { content: errMsg, error: true };
      }
    },
    [language]
  );

  async function sendQuestion(question: string, modelIds: string[]) {
    setPhase("responding");
    setSelectedModelIds(modelIds);

    const detectedLang = detectLanguage(question);
    setLanguage(detectedLang);
    setUserQuestion(question);
    setRound(1);
    setHasSummary(false);

    const userMsg: ChatMessage = {
      id: nextId(),
      role: "user",
      content: question,
    };
    setMessages([userMsg]);

    // Stream all models in parallel
    const config = readConfig();
    setStreamingProgress(`0/${modelIds.length} models responded`);

    let completed = 0;
    const promises = modelIds.map((modelId) =>
      streamModelResponse(modelId, question, 1, []).then((result) => {
        completed++;
        setStreamingProgress(`${completed}/${modelIds.length} models responded`);
        const info = getModelInfo(modelId, config.customModels);
        return { modelName: info.name, content: result.content, error: result.error };
      })
    );

    const results = await Promise.allSettled(promises);
    const responses = results
      .filter((r): r is PromiseFulfilledResult<{ modelName: string; content: string; error?: boolean }> =>
        r.status === "fulfilled" && !r.value.error
      )
      .map((r) => ({ modelName: r.value.modelName, content: r.value.content }));

    setStreamingProgress("");

    // Save conversation
    try {
      const id = createConversation(
        question.slice(0, 80),
        modelIds.map((id) => getModelInfo(id, config.customModels).name),
        detectedLang
      );
      setConversationId(id);

      let content = "\n## Round 1 - Initial Responses\n\n";
      for (const r of responses) {
        content += `### ${r.modelName}\n${r.content}\n\n`;
      }
      appendToConversation(id, content);
      updateRoundCount(id, 1);
    } catch {
      // non-fatal
    }

    setPhase("idle");
  }

  async function keepDebating() {
    if (phase !== "idle") return;
    setPhase("debating");

    const nextRound = round + 1;
    setRound(nextRound);
    const config = readConfig();

    // Gather previous responses + user follow-ups
    const prevResponses: { modelName: string; content: string }[] = [];
    const recentMessages = messagesRef.current;

    const modelMsgs = recentMessages
      .filter((m) => m.role === "model" && !m.error)
      .slice(-selectedModelIds.length);
    for (const m of modelMsgs) {
      prevResponses.push({ modelName: m.modelName || m.modelId || "", content: m.content });
    }

    const lastModelIdx = recentMessages.findLastIndex((m) => m.role === "model");
    if (lastModelIdx >= 0) {
      const followUps = recentMessages.slice(lastModelIdx + 1).filter((m) => m.role === "user");
      for (const m of followUps) {
        prevResponses.push({ modelName: "User", content: m.content });
      }
    }

    // Stream in parallel
    setStreamingProgress(`0/${selectedModelIds.length} models responded`);
    let completed = 0;
    const promises = selectedModelIds.map((modelId) =>
      streamModelResponse(modelId, userQuestion, nextRound, prevResponses).then((result) => {
        completed++;
        setStreamingProgress(`${completed}/${selectedModelIds.length} models responded`);
        const info = getModelInfo(modelId, config.customModels);
        return { modelName: info.name, content: result.content, error: result.error };
      })
    );

    const results = await Promise.allSettled(promises);
    const responses = results
      .filter((r): r is PromiseFulfilledResult<{ modelName: string; content: string; error?: boolean }> =>
        r.status === "fulfilled" && !r.value.error
      )
      .map((r) => ({ modelName: r.value.modelName, content: r.value.content }));

    setStreamingProgress("");

    // Save round
    if (conversationId) {
      try {
        let content = `\n## Round ${nextRound} - Debate\n\n`;
        for (const r of responses) {
          content += `### ${r.modelName}\n${r.content}\n\n`;
        }
        appendToConversation(conversationId, content);
        updateRoundCount(conversationId, nextRound);
      } catch {
        // non-fatal
      }
    }

    setPhase("idle");
  }

  async function summarize() {
    if (phase !== "idle") return;
    setPhase("summarizing");

    const config = readConfig();
    const fullConversation = messagesRef.current
      .filter((m) => m.role !== "moderator")
      .map((m) => {
        if (m.role === "user") return `User: ${m.content}`;
        return `${m.modelName || m.modelId}: ${m.content}`;
      })
      .join("\n\n");

    const systemPrompt = buildSummaryPrompt({
      language,
      originalQuestion: userQuestion,
      fullConversation,
    });

    const moderatorModel = config.moderatorModel;
    const provider = await getProviderForModel(
      moderatorModel,
      config.providers,
      config.customModels
    );

    const summaryMsgId = nextId();
    const moderatorInfo = getModelInfo(moderatorModel, config.customModels);

    setMessages((prev) => [
      ...prev,
      {
        id: summaryMsgId,
        role: "moderator",
        modelName: moderatorInfo.name,
        content: "",
        streaming: true,
      },
    ]);

    let summaryContent = "";

    if (provider) {
      try {
        const response = await provider.chat({
          model: moderatorModel,
          messages: [{ role: "user", content: systemPrompt }],
          temperature: 0.3,
        });

        const reader = response.stream.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") break;

            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                summaryContent += parsed.content;
              }
            } catch {
              // skip
            }
          }

          setMessages((prev) =>
            prev.map((m) =>
              m.id === summaryMsgId ? { ...m, content: summaryContent } : m
            )
          );
        }
      } catch {
        summaryContent = "Failed to generate summary.";
      }
    } else {
      summaryContent = "No provider configured for moderator model.";
    }

    setMessages((prev) =>
      prev.map((m) =>
        m.id === summaryMsgId ? { ...m, content: summaryContent, streaming: false } : m
      )
    );

    // Save summary + update memory
    if (conversationId && summaryContent) {
      try {
        appendToConversation(
          conversationId,
          `\n## Summary (by ${moderatorInfo.name})\n\n${summaryContent}\n`
        );
      } catch {
        // non-fatal
      }

      try {
        updateMemory(userQuestion, summaryContent);
      } catch {
        // non-fatal
      }
    }

    setHasSummary(true);
    setPhase("idle");
  }

  function addUserFollowUp(text: string) {
    if (!text.trim() || phase !== "idle" || round === 0) return;
    const userMsg: ChatMessage = {
      id: nextId(),
      role: "user",
      content: text.trim(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setUserQuestion((prev) => prev + "\n\n[User follow-up]: " + text.trim());
  }

  function retryModel(messageId: string) {
    const msg = messagesRef.current.find((m) => m.id === messageId);
    if (!msg || !msg.modelId || phase !== "idle") return;

    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    streamModelResponse(msg.modelId, userQuestion, round || 1, []);
  }

  function resetChat() {
    setMessages([]);
    setRound(0);
    setPhase("idle");
    setUserQuestion("");
    setLanguage("English");
    setHasSummary(false);
    setConversationId(null);
    setStreamingProgress("");
  }

  function loadConversation(id: string, parsedMessages: ChatMessage[], parsedRound: number, parsedQuestion: string, parsedHasSummary: boolean, parsedLanguage: Language, modelIds: string[]) {
    setMessages(parsedMessages);
    setRound(parsedRound);
    setConversationId(id);
    setUserQuestion(parsedQuestion);
    setHasSummary(parsedHasSummary);
    setLanguage(parsedLanguage);
    setSelectedModelIds(modelIds);
    setPhase("idle");
  }

  return {
    messages,
    round,
    phase,
    userQuestion,
    hasSummary,
    conversationId,
    selectedModelIds,
    streamingProgress,
    sendQuestion,
    keepDebating,
    summarize,
    addUserFollowUp,
    retryModel,
    resetChat,
    loadConversation,
    setSelectedModelIds,
  };
}
```

- [ ] **Step 2: Commit**

```bash
cd ~/multi-model-arena
git add src/terminal/hooks/useChat.ts
git commit -m "feat: add useChat hook with streaming, debate, summary logic"
```

---

### Task 4: useConversations and useConnection Hooks

**Files:**
- Create: `src/terminal/hooks/useConversations.ts`
- Create: `src/terminal/hooks/useConnection.ts`

- [ ] **Step 1: Create the conversations hook**

Create `src/terminal/hooks/useConversations.ts`:

```typescript
import { useState, useCallback } from "react";
import {
  listConversations,
  readConversation,
  deleteConversation,
} from "../../lib/conversations.js";
import { getModelInfo, getAllModels } from "../../lib/models.js";
import { readConfig } from "../../lib/config.js";
import { detectLanguage } from "../../lib/language.js";
import type { ConversationMeta } from "../../lib/conversations.js";
import type { ChatMessage } from "./useChat.js";

export function useConversations() {
  const [conversations, setConversations] = useState<ConversationMeta[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  function refresh() {
    const list = listConversations();
    setConversations(list);
    if (selectedIndex >= list.length) {
      setSelectedIndex(Math.max(0, list.length - 1));
    }
  }

  function remove(id: string) {
    deleteConversation(id);
    refresh();
  }

  function parseConversation(id: string): {
    messages: ChatMessage[];
    round: number;
    question: string;
    hasSummary: boolean;
    language: ReturnType<typeof detectLanguage>;
    modelIds: string[];
  } | null {
    const content = readConversation(id);
    if (!content) return null;

    const config = readConfig();
    const allModels = getAllModels(config.customModels);
    const messages: ChatMessage[] = [];
    const lines = content.split("\n");
    let currentModel = "";
    let currentContent = "";
    let inSummary = false;
    let summaryContent = "";
    let parsedTitle = "";
    let parsedRound = 0;
    let parsedModelNames: string[] = [];
    let hasSummarySection = false;

    let counter = 0;
    function nextId() {
      return `loaded-${++counter}`;
    }

    for (const line of lines) {
      const titleMatch = line.match(/^# (.+)$/);
      if (titleMatch) {
        parsedTitle = titleMatch[1];
        messages.push({ id: nextId(), role: "user", content: parsedTitle });
        continue;
      }

      const roundMatch = line.match(/^\*Debate rounds:\s*(\d+)\*$/);
      if (roundMatch) {
        parsedRound = parseInt(roundMatch[1], 10);
        continue;
      }

      const modelsMatch = line.match(/^\*Models:\s*(.+)\*$/);
      if (modelsMatch) {
        parsedModelNames = modelsMatch[1].split(",").map((s) => s.trim());
        continue;
      }

      if (line.match(/^## Summary/)) {
        if (currentModel && currentContent.trim()) {
          const resolved = resolveModelId(currentModel, allModels);
          messages.push({
            id: nextId(),
            role: "model",
            modelId: resolved,
            modelName: currentModel,
            content: currentContent.trim(),
          });
          currentModel = "";
          currentContent = "";
        }
        inSummary = true;
        hasSummarySection = true;
        continue;
      }

      if (inSummary) {
        summaryContent += line + "\n";
        continue;
      }

      const modelMatch = line.match(/^### (.+)$/);
      if (modelMatch) {
        if (currentModel && currentContent.trim()) {
          const resolved = resolveModelId(currentModel, allModels);
          messages.push({
            id: nextId(),
            role: "model",
            modelId: resolved,
            modelName: currentModel,
            content: currentContent.trim(),
          });
        }
        currentModel = modelMatch[1];
        currentContent = "";
        continue;
      }

      if (line.match(/^## Round/) || line.match(/^\*.*\*$/)) {
        continue;
      }

      if (currentModel) {
        currentContent += line + "\n";
      }
    }

    if (currentModel && currentContent.trim()) {
      const resolved = resolveModelId(currentModel, allModels);
      messages.push({
        id: nextId(),
        role: "model",
        modelId: resolved,
        modelName: currentModel,
        content: currentContent.trim(),
      });
    }

    if (summaryContent.trim()) {
      messages.push({
        id: nextId(),
        role: "moderator",
        content: summaryContent.trim(),
      });
    }

    const modelIds = parsedModelNames
      .map((name) => resolveModelId(name, allModels))
      .filter(Boolean);

    return {
      messages,
      round: parsedRound || 1,
      question: parsedTitle,
      hasSummary: hasSummarySection,
      language: detectLanguage(parsedTitle),
      modelIds,
    };
  }

  return {
    conversations,
    selectedIndex,
    setSelectedIndex,
    refresh,
    remove,
    parseConversation,
  };
}

function resolveModelId(
  name: string,
  allModels: { id: string; name: string }[]
): string {
  const found = allModels.find(
    (m) => m.name === name || m.name.toLowerCase() === name.toLowerCase()
  );
  return found?.id || name;
}
```

- [ ] **Step 2: Create the connection hook**

Create `src/terminal/hooks/useConnection.ts`:

```typescript
import { useState, useEffect } from "react";

export function useConnection() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    async function check() {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const res = await fetch("https://openrouter.ai/api/v1/models", {
          method: "HEAD",
          signal: controller.signal,
        });
        clearTimeout(timeout);
        setOnline(res.ok);
      } catch {
        setOnline(false);
      }
    }

    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, []);

  return online;
}
```

- [ ] **Step 3: Commit**

```bash
cd ~/multi-model-arena
git add src/terminal/hooks/
git commit -m "feat: add useConversations and useConnection hooks"
```

---

### Task 5: Terminal UI Components (MessageBubble, SummaryBox, StatusDot, ConfirmDialog)

**Files:**
- Create: `src/terminal/components/MessageBubble.tsx`
- Create: `src/terminal/components/SummaryBox.tsx`
- Create: `src/terminal/components/StatusDot.tsx`
- Create: `src/terminal/components/ConfirmDialog.tsx`

- [ ] **Step 1: Create MessageBubble**

Create `src/terminal/components/MessageBubble.tsx`:

```tsx
import React from "react";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import { getModelColor } from "../theme.js";

interface MessageBubbleProps {
  role: "user" | "model" | "moderator";
  modelId?: string;
  modelName?: string;
  modelColor?: string;
  content: string;
  error?: boolean;
  streaming?: boolean;
}

export function MessageBubble({
  role,
  modelId,
  modelName,
  modelColor,
  content,
  error,
  streaming,
}: MessageBubbleProps) {
  if (role === "user") {
    return (
      <Box marginY={0} paddingX={1}>
        <Text bold color="white">
          You:{" "}
        </Text>
        <Text color="white">{content}</Text>
      </Box>
    );
  }

  const color = modelColor || (modelId ? getModelColor(modelId) : "gray");
  const name = modelName || modelId || "Model";

  if (error) {
    return (
      <Box marginY={0} paddingX={1} flexDirection="column">
        <Box>
          <Text color={color} bold>
            ● {name}
          </Text>
        </Box>
        <Box paddingLeft={2}>
          <Text color="gray" italic>
            did not respond
          </Text>
          <Text color="yellow"> [R]etry</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box marginY={0} paddingX={1} flexDirection="column">
      <Box>
        <Text color={color} bold>
          ● {name}
        </Text>
        {streaming && (
          <Text color={color}>
            {" "}
            <Spinner type="dots" />
          </Text>
        )}
      </Box>
      <Box paddingLeft={2}>
        <Text wrap="wrap">{content}</Text>
      </Box>
    </Box>
  );
}
```

- [ ] **Step 2: Create SummaryBox**

Create `src/terminal/components/SummaryBox.tsx`:

```tsx
import React from "react";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import { COLORS } from "../theme.js";

interface SummaryBoxProps {
  content: string;
  moderatorName?: string;
  streaming?: boolean;
}

export function SummaryBox({ content, moderatorName, streaming }: SummaryBoxProps) {
  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor={COLORS.summaryBorder}
      paddingX={2}
      paddingY={1}
      marginX={1}
      marginY={1}
    >
      <Box>
        <Text color={COLORS.summaryText} bold>
          ✦ SUMMARY
        </Text>
        {moderatorName && (
          <Text color={COLORS.dimText}> by {moderatorName}</Text>
        )}
        {streaming && (
          <Text color={COLORS.summaryText}>
            {" "}
            <Spinner type="dots" />
          </Text>
        )}
      </Box>
      <Box marginTop={1}>
        <Text wrap="wrap">{content}</Text>
      </Box>
      {!streaming && content && (
        <Box marginTop={1}>
          <Text color={COLORS.dimText}>[C] Copy to clipboard</Text>
        </Box>
      )}
    </Box>
  );
}
```

- [ ] **Step 3: Create StatusDot**

Create `src/terminal/components/StatusDot.tsx`:

```tsx
import React from "react";
import { Text } from "ink";

interface StatusDotProps {
  online: boolean;
}

export function StatusDot({ online }: StatusDotProps) {
  if (online) {
    return <Text color="green">●</Text>;
  }
  return <Text color="red">● OFFLINE</Text>;
}
```

- [ ] **Step 4: Create ConfirmDialog**

Create `src/terminal/components/ConfirmDialog.tsx`:

```tsx
import React from "react";
import { Box, Text, useInput } from "ink";
import { COLORS } from "../theme.js";

interface ConfirmDialogProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useInput((input, key) => {
    if (input === "y" || input === "Y") onConfirm();
    if (input === "n" || input === "N" || key.escape) onCancel();
  });

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={COLORS.border}
      paddingX={3}
      paddingY={1}
      marginX={2}
    >
      <Text bold>{title}</Text>
      <Text color={COLORS.dimText}>{message}</Text>
      <Box marginTop={1}>
        <Text>
          <Text color="green" bold>[Y]</Text>
          <Text> Yes </Text>
          <Text color="red" bold>[N]</Text>
          <Text> No</Text>
        </Text>
      </Box>
    </Box>
  );
}
```

- [ ] **Step 5: Commit**

```bash
cd ~/multi-model-arena
git add src/terminal/components/
git commit -m "feat: add terminal UI components (MessageBubble, SummaryBox, StatusDot, ConfirmDialog)"
```

---

### Task 6: Sidebar, ControlBar, InputBar Components

**Files:**
- Create: `src/terminal/components/Sidebar.tsx`
- Create: `src/terminal/components/ControlBar.tsx`
- Create: `src/terminal/components/InputBar.tsx`

- [ ] **Step 1: Create Sidebar**

Create `src/terminal/components/Sidebar.tsx`:

```tsx
import React from "react";
import { Box, Text, useInput } from "ink";
import { COLORS } from "../theme.js";
import type { ConversationMeta } from "../../lib/conversations.js";

interface SidebarProps {
  conversations: ConversationMeta[];
  selectedIndex: number;
  activeConversationId: string | null;
  focused: boolean;
  onSelect: (id: string) => void;
  onSelectedIndexChange: (index: number) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onOpenSettings: () => void;
}

export function Sidebar({
  conversations,
  selectedIndex,
  activeConversationId,
  focused,
  onSelect,
  onSelectedIndexChange,
  onNew,
  onDelete,
  onOpenSettings,
}: SidebarProps) {
  useInput(
    (input, key) => {
      if (!focused) return;

      if (key.upArrow && selectedIndex > 0) {
        onSelectedIndexChange(selectedIndex - 1);
      }
      if (key.downArrow && selectedIndex < conversations.length - 1) {
        onSelectedIndexChange(selectedIndex + 1);
      }
      if (key.return && conversations[selectedIndex]) {
        onSelect(conversations[selectedIndex].id);
      }
      if ((key.delete || input === "x") && conversations[selectedIndex]) {
        onDelete(conversations[selectedIndex].id);
      }
    },
    { isActive: focused }
  );

  return (
    <Box
      flexDirection="column"
      width={22}
      borderStyle="single"
      borderColor={focused ? COLORS.inputFocusBorder : COLORS.border}
      paddingX={1}
    >
      <Text bold color={COLORS.dimText}>
        ─ History ─
      </Text>

      <Box flexDirection="column" flexGrow={1} marginTop={1}>
        {conversations.length === 0 && (
          <Text color={COLORS.dimText} italic>
            No conversations
          </Text>
        )}
        {conversations.slice(0, 20).map((conv, i) => {
          const isActive = conv.id === activeConversationId;
          const isSelected = i === selectedIndex && focused;
          return (
            <Box key={conv.id}>
              <Text
                color={isActive ? "yellow" : isSelected ? "white" : COLORS.dimText}
                bold={isActive}
                inverse={isSelected}
                wrap="truncate"
              >
                {isActive ? "▸ " : "  "}
                {conv.title.slice(0, 18)}
              </Text>
            </Box>
          );
        })}
      </Box>

      <Box flexDirection="column" marginTop={1}>
        <Text color={COLORS.dimText}>[S] Settings</Text>
        <Text color={COLORS.dimText}>[N] New</Text>
      </Box>
    </Box>
  );
}
```

- [ ] **Step 2: Create ControlBar**

Create `src/terminal/components/ControlBar.tsx`:

```tsx
import React from "react";
import { Box, Text } from "ink";
import { COLORS } from "../theme.js";

interface ControlBarProps {
  round: number;
  maxRounds: number;
  streamingProgress: string;
  isResponding: boolean;
}

export function ControlBar({
  round,
  maxRounds,
  streamingProgress,
  isResponding,
}: ControlBarProps) {
  const canDebate = round < maxRounds;

  return (
    <Box
      borderStyle="single"
      borderColor={COLORS.border}
      paddingX={2}
      justifyContent="space-between"
    >
      <Box gap={2}>
        {canDebate && (
          <Text color={isResponding ? COLORS.dimText : "green"} bold>
            [D]ebate
          </Text>
        )}
        <Text color={isResponding ? COLORS.dimText : "yellow"} bold>
          [S]ummarize
        </Text>
        <Text color={isResponding ? COLORS.dimText : "cyan"} bold>
          [M]odels
        </Text>
      </Box>
      <Box gap={2}>
        {streamingProgress && (
          <Text color={COLORS.dimText}>{streamingProgress}</Text>
        )}
        <Text color={COLORS.dimText}>
          Round {round}/{maxRounds}
        </Text>
      </Box>
    </Box>
  );
}
```

- [ ] **Step 3: Create InputBar**

Create `src/terminal/components/InputBar.tsx`:

```tsx
import React from "react";
import { Box, Text } from "ink";
import TextInput from "ink-text-input";
import { COLORS } from "../theme.js";

interface InputBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  focused?: boolean;
}

export function InputBar({
  value,
  onChange,
  onSubmit,
  disabled,
  placeholder,
  focused = true,
}: InputBarProps) {
  return (
    <Box
      borderStyle="single"
      borderColor={focused ? COLORS.inputFocusBorder : COLORS.border}
      paddingX={1}
    >
      <Text color={COLORS.dimText}>{"❯ "}</Text>
      {disabled ? (
        <Text color={COLORS.dimText}>{placeholder || "..."}</Text>
      ) : (
        <TextInput
          value={value}
          onChange={onChange}
          onSubmit={onSubmit}
          placeholder={placeholder || "Type your message..."}
          focus={focused}
        />
      )}
    </Box>
  );
}
```

- [ ] **Step 4: Commit**

```bash
cd ~/multi-model-arena
git add src/terminal/components/
git commit -m "feat: add Sidebar, ControlBar, InputBar terminal components"
```

---

### Task 7: ModelPicker Component

**Files:**
- Create: `src/terminal/components/ModelPicker.tsx`

- [ ] **Step 1: Create ModelPicker**

Create `src/terminal/components/ModelPicker.tsx`:

```tsx
import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import { getAllModels } from "../../lib/models.js";
import { readConfig } from "../../lib/config.js";
import { getModelColor } from "../theme.js";
import { COLORS } from "../theme.js";

interface ModelPickerProps {
  initialSelected: string[];
  maxModels: number;
  onConfirm: (selectedIds: string[]) => void;
  onCancel: () => void;
}

export function ModelPicker({
  initialSelected,
  maxModels,
  onConfirm,
  onCancel,
}: ModelPickerProps) {
  const config = readConfig();
  const allModels = getAllModels(config.customModels);
  const [selected, setSelected] = useState<Set<string>>(new Set(initialSelected));
  const [cursor, setCursor] = useState(0);

  useInput((input, key) => {
    if (key.escape) {
      onCancel();
      return;
    }
    if (key.return) {
      if (selected.size > 0) {
        onConfirm(Array.from(selected));
      }
      return;
    }
    if (key.upArrow) {
      setCursor((c) => Math.max(0, c - 1));
      return;
    }
    if (key.downArrow) {
      setCursor((c) => Math.min(allModels.length - 1, c + 1));
      return;
    }
    if (input === " ") {
      const model = allModels[cursor];
      if (!model) return;
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(model.id)) {
          next.delete(model.id);
        } else if (next.size < maxModels) {
          next.add(model.id);
        }
        return next;
      });
    }
  });

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={COLORS.border}
      paddingX={3}
      paddingY={1}
      alignSelf="center"
    >
      <Text bold>
        Select Models ({selected.size}/{maxModels})
      </Text>
      <Box marginTop={1} flexDirection="column">
        {allModels.map((model, i) => {
          const isSelected = selected.has(model.id);
          const isCursor = i === cursor;
          const color = getModelColor(model.id, model.color);
          return (
            <Box key={model.id}>
              <Text inverse={isCursor}>
                <Text color={isSelected ? "green" : COLORS.dimText}>
                  {isSelected ? "[x]" : "[ ]"}
                </Text>
                <Text color={color}> {model.name}</Text>
                <Text color={COLORS.dimText}> ({model.providerId})</Text>
              </Text>
            </Box>
          );
        })}
      </Box>
      <Box marginTop={1}>
        <Text color={COLORS.dimText}>
          ↑↓ Navigate • Space Toggle • Enter Start • Esc Cancel
        </Text>
      </Box>
    </Box>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd ~/multi-model-arena
git add src/terminal/components/ModelPicker.tsx
git commit -m "feat: add ModelPicker component for terminal"
```

---

### Task 8: ChatScreen (Main Screen)

**Files:**
- Modify: `src/terminal/screens/ChatScreen.tsx`

- [ ] **Step 1: Build the full ChatScreen**

Replace `src/terminal/screens/ChatScreen.tsx`:

```tsx
import React, { useState, useEffect } from "react";
import { Box, Text, useInput, useApp } from "ink";
import { default as clipboard } from "clipboardy";
import { readConfig } from "../../lib/config.js";
import { useChat } from "../hooks/useChat.js";
import { useConversations } from "../hooks/useConversations.js";
import { useConnection } from "../hooks/useConnection.js";
import { Sidebar } from "../components/Sidebar.js";
import { MessageBubble } from "../components/MessageBubble.js";
import { SummaryBox } from "../components/SummaryBox.js";
import { ControlBar } from "../components/ControlBar.js";
import { InputBar } from "../components/InputBar.js";
import { ModelPicker } from "../components/ModelPicker.js";
import { StatusDot } from "../components/StatusDot.js";
import { ConfirmDialog } from "../components/ConfirmDialog.js";
import { COLORS } from "../theme.js";
import { getModelColor } from "../theme.js";

const MAX_ROUNDS = 10;
const MAX_MODELS = 8;

interface ChatScreenProps {
  onOpenSettings: () => void;
  onQuit: () => void;
}

export function ChatScreen({ onOpenSettings, onQuit }: ChatScreenProps) {
  const { exit } = useApp();
  const chat = useChat();
  const convs = useConversations();
  const online = useConnection();

  const [inputValue, setInputValue] = useState("");
  const [focusPanel, setFocusPanel] = useState<"sidebar" | "chat">("chat");
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [showNewConvPicker, setShowNewConvPicker] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Load conversation list on mount
  useEffect(() => {
    convs.refresh();
  }, []);

  // Refresh conversation list after saving
  useEffect(() => {
    if (chat.conversationId) {
      convs.refresh();
    }
  }, [chat.conversationId]);

  // Global keyboard shortcuts
  useInput((input, key) => {
    if (showModelPicker || showNewConvPicker || deleteConfirmId) return;

    // Tab to switch panels
    if (key.tab) {
      setFocusPanel((prev) => (prev === "sidebar" ? "chat" : "sidebar"));
      return;
    }

    // Ctrl+S for settings
    if (input === "s" && key.ctrl) {
      onOpenSettings();
      return;
    }

    // Q to quit (only when input is empty)
    if (input === "q" && !inputValue) {
      exit();
      return;
    }

    // Shortcuts only when input is empty and chat panel is focused
    if (focusPanel === "chat" && !inputValue && chat.phase === "idle") {
      if (input === "d" && chat.round > 0 && !chat.hasSummary && chat.round < MAX_ROUNDS) {
        chat.keepDebating();
        return;
      }
      if (input === "s" && chat.round > 0 && !chat.hasSummary) {
        chat.summarize();
        return;
      }
      if (input === "m" && chat.round > 0 && !chat.hasSummary) {
        setShowModelPicker(true);
        return;
      }
      if (input === "n") {
        chat.resetChat();
        setShowNewConvPicker(true);
        return;
      }
      if (input === "r") {
        // Retry first failed model
        const failed = chat.messages.find((m) => m.error && m.modelId);
        if (failed) {
          chat.retryModel(failed.id);
        }
        return;
      }
      if (input === "c") {
        // Copy summary
        const summary = chat.messages.find((m) => m.role === "moderator");
        if (summary) {
          clipboard.writeSync(summary.content);
        }
        return;
      }
    }

    // N for new conversation from sidebar
    if (focusPanel === "sidebar" && input === "n") {
      chat.resetChat();
      setShowNewConvPicker(true);
      return;
    }
  });

  // Handle sending a message
  function handleSend(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;
    setInputValue("");

    if (chat.round === 0) {
      // First message - need to pick models first
      chat.resetChat();
      setShowNewConvPicker(true);
      // Store the question temporarily
      setInputValue(trimmed);
      return;
    }

    // Follow-up during debate
    chat.addUserFollowUp(trimmed);
  }

  // Handle selecting a conversation from sidebar
  function handleSelectConversation(id: string) {
    const parsed = convs.parseConversation(id);
    if (parsed) {
      chat.loadConversation(
        id,
        parsed.messages,
        parsed.round,
        parsed.question,
        parsed.hasSummary,
        parsed.language,
        parsed.modelIds
      );
      setFocusPanel("chat");
    }
  }

  // Model picker confirmed - start conversation
  function handleModelsConfirmed(modelIds: string[]) {
    setShowNewConvPicker(false);
    setShowModelPicker(false);
    const question = inputValue;
    setInputValue("");
    if (question) {
      chat.sendQuestion(question, modelIds);
    }
  }

  // Delete confirmation
  function handleDeleteConfirm() {
    if (deleteConfirmId) {
      convs.remove(deleteConfirmId);
      if (chat.conversationId === deleteConfirmId) {
        chat.resetChat();
      }
      setDeleteConfirmId(null);
    }
  }

  // Show model picker overlay
  if (showModelPicker || showNewConvPicker) {
    const config = readConfig();
    return (
      <Box flexDirection="column" height="100%" justifyContent="center" alignItems="center">
        <ModelPicker
          initialSelected={chat.selectedModelIds.length > 0 ? chat.selectedModelIds : config.defaultModels}
          maxModels={MAX_MODELS}
          onConfirm={handleModelsConfirmed}
          onCancel={() => {
            setShowModelPicker(false);
            setShowNewConvPicker(false);
          }}
        />
      </Box>
    );
  }

  // Show delete confirmation
  if (deleteConfirmId) {
    return (
      <Box flexDirection="column" height="100%" justifyContent="center" alignItems="center">
        <ConfirmDialog
          title="Delete conversation?"
          message="This cannot be undone."
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteConfirmId(null)}
        />
      </Box>
    );
  }

  const showControlBar = chat.round > 0 && chat.phase === "idle" && !chat.hasSummary;
  const isResponding = chat.phase !== "idle";
  const inputDisabled = isResponding || chat.hasSummary;

  return (
    <Box flexDirection="row" height="100%">
      {/* Sidebar */}
      <Sidebar
        conversations={convs.conversations}
        selectedIndex={convs.selectedIndex}
        activeConversationId={chat.conversationId}
        focused={focusPanel === "sidebar"}
        onSelect={handleSelectConversation}
        onSelectedIndexChange={convs.setSelectedIndex}
        onNew={() => {
          chat.resetChat();
          setShowNewConvPicker(true);
        }}
        onDelete={(id) => setDeleteConfirmId(id)}
        onOpenSettings={onOpenSettings}
      />

      {/* Main chat area */}
      <Box flexDirection="column" flexGrow={1}>
        {/* Header */}
        <Box
          borderStyle="single"
          borderColor={COLORS.border}
          paddingX={2}
          justifyContent="space-between"
        >
          <Text bold color="white">
            ⚔ Arena
          </Text>
          <StatusDot online={online} />
        </Box>

        {/* Messages */}
        <Box flexDirection="column" flexGrow={1} overflow="hidden">
          {chat.messages.length === 0 ? (
            <Box
              flexDirection="column"
              justifyContent="center"
              alignItems="center"
              flexGrow={1}
              gap={1}
            >
              <Text color={COLORS.summaryText} bold>
                ⚔ Multi-Model Arena
              </Text>
              <Text color={COLORS.dimText}>
                Press [N] for new conversation or type a question
              </Text>
            </Box>
          ) : (
            <Box flexDirection="column" gap={1} paddingY={1}>
              {chat.messages.map((msg) => {
                if (msg.role === "moderator") {
                  return (
                    <SummaryBox
                      key={msg.id}
                      content={msg.content}
                      moderatorName={msg.modelName}
                      streaming={msg.streaming}
                    />
                  );
                }
                return (
                  <MessageBubble
                    key={msg.id}
                    role={msg.role}
                    modelId={msg.modelId}
                    modelName={msg.modelName}
                    modelColor={msg.modelId ? getModelColor(msg.modelId) : undefined}
                    content={msg.content}
                    error={msg.error}
                    streaming={msg.streaming}
                  />
                );
              })}
            </Box>
          )}
        </Box>

        {/* Control bar */}
        {showControlBar && (
          <ControlBar
            round={chat.round}
            maxRounds={MAX_ROUNDS}
            streamingProgress={chat.streamingProgress}
            isResponding={isResponding}
          />
        )}

        {/* Input */}
        <InputBar
          value={inputValue}
          onChange={setInputValue}
          onSubmit={handleSend}
          disabled={inputDisabled}
          focused={focusPanel === "chat"}
          placeholder={
            chat.hasSummary
              ? "Press [N] for new conversation"
              : chat.round > 0
                ? "Add your thoughts (optional)..."
                : "Type a question to start..."
          }
        />
      </Box>
    </Box>
  );
}
```

- [ ] **Step 2: Test the chat screen**

```bash
cd ~/multi-model-arena
npx tsx src/terminal/index.tsx
```

Expected: Full chat interface with sidebar, message area, and input. Press `n` to open model picker.

- [ ] **Step 3: Commit**

```bash
cd ~/multi-model-arena
git add src/terminal/screens/ChatScreen.tsx
git commit -m "feat: build full ChatScreen with sidebar, messages, controls"
```

---

### Task 9: Settings Screen

**Files:**
- Modify: `src/terminal/screens/SettingsScreen.tsx`

- [ ] **Step 1: Build the full Settings screen**

Replace `src/terminal/screens/SettingsScreen.tsx`:

```tsx
import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import keytar from "keytar";
import { readConfig, writeConfig } from "../../lib/config.js";
import type { AppConfig, ProviderConfig } from "../../lib/config.js";
import { getAllModels } from "../../lib/models.js";
import { moveConversationsFolder } from "../../lib/conversations.js";
import { COLORS } from "../theme.js";

type SettingsSection =
  | "main"
  | "add-provider"
  | "edit-key"
  | "add-model"
  | "change-route";

interface SettingsScreenProps {
  onBack: () => void;
}

const PRESET_PROVIDERS: Record<string, { name: string; url: string }> = {
  openai: { name: "OpenAI Direct", url: "https://api.openai.com/v1" },
  anthropic: { name: "Anthropic Direct", url: "https://api.anthropic.com/v1" },
  google: { name: "Google AI", url: "https://generativelanguage.googleapis.com/v1beta/openai" },
  deepseek: { name: "DeepSeek Direct", url: "https://api.deepseek.com/v1" },
};

export function SettingsScreen({ onBack }: SettingsScreenProps) {
  const [config, setConfig] = useState<AppConfig>(readConfig());
  const [section, setSection] = useState<SettingsSection>("main");
  const [cursor, setCursor] = useState(0);
  const [providerStatuses, setProviderStatuses] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState("");

  // Form states
  const [formName, setFormName] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formKey, setFormKey] = useState("");
  const [formField, setFormField] = useState(0); // which field is focused

  // Check provider key status
  useEffect(() => {
    async function check() {
      const statuses: Record<string, boolean> = {};
      for (const p of config.providers) {
        const key = await keytar.getPassword("multi-model-arena", p.id);
        statuses[p.id] = !!key;
      }
      setProviderStatuses(statuses);
    }
    check();
  }, [config.providers]);

  function save(patch: Partial<AppConfig>) {
    const updated = writeConfig(patch);
    setConfig(updated);
    setMessage("Saved");
    setTimeout(() => setMessage(""), 2000);
  }

  useInput((input, key) => {
    if (section !== "main") return;

    if (key.escape) {
      onBack();
      return;
    }

    // Temperature adjustment
    if (input === "," || key.leftArrow) {
      save({ temperature: Math.max(0, config.temperature - 0.1) });
    }
    if (input === "." || key.rightArrow) {
      save({ temperature: Math.min(2, config.temperature + 0.1) });
    }

    // Quick actions
    if (input === "a") {
      setSection("add-provider");
      setFormName("");
      setFormUrl("");
      setFormKey("");
      setFormField(0);
    }
    if (input === "t") {
      save({
        debateStyle: config.debateStyle === "collaborative" ? "adversarial" : "collaborative",
      });
    }
    if (input === "e") {
      save({ memoryEnabled: !config.memoryEnabled });
    }
  });

  if (section === "main") {
    const allModels = getAllModels(config.customModels);
    return (
      <Box flexDirection="column" height="100%">
        <Box
          borderStyle="single"
          borderColor={COLORS.border}
          paddingX={2}
          justifyContent="space-between"
        >
          <Text bold color="white">Settings</Text>
          <Box gap={2}>
            {message && <Text color="green">{message}</Text>}
            <Text color={COLORS.dimText}>Esc to go back</Text>
          </Box>
        </Box>

        <Box flexDirection="column" paddingX={2} paddingY={1} gap={1}>
          {/* API Providers */}
          <Text bold underline>API Providers</Text>
          {config.providers.map((p) => (
            <Box key={p.id} gap={1}>
              <Text color={providerStatuses[p.id] ? "green" : "yellow"}>●</Text>
              <Text>{p.name}</Text>
              <Text color={COLORS.dimText}>
                {providerStatuses[p.id] ? "Connected" : "No key"}
              </Text>
              {p.isDefault && <Text color="yellow">(default)</Text>}
            </Box>
          ))}
          <Text color={COLORS.dimText}>[A] Add Provider</Text>

          {/* Model Routing */}
          <Text bold underline>Model Routing</Text>
          {allModels.map((m) => {
            const provider = config.providers.find((p) => p.id === m.providerId);
            return (
              <Box key={m.id} gap={1}>
                <Text color={COLORS.dimText}>{m.name}</Text>
                <Text color={COLORS.dimText}>→</Text>
                <Text>{provider?.name || m.providerId}</Text>
              </Box>
            );
          })}

          {/* General Settings */}
          <Text bold underline>General</Text>
          <Box gap={1}>
            <Text>Moderator:</Text>
            <Text color="cyan">{config.moderatorModel}</Text>
          </Box>
          <Box gap={1}>
            <Text>Debate Style:</Text>
            <Text color="cyan">{config.debateStyle}</Text>
            <Text color={COLORS.dimText}>[T] Toggle</Text>
          </Box>
          <Box gap={1}>
            <Text>Temperature:</Text>
            <Text color="cyan">{config.temperature.toFixed(1)}</Text>
            <Text color={COLORS.dimText}>[←→] Adjust</Text>
          </Box>
          <Box gap={1}>
            <Text>Memory:</Text>
            <Text color={config.memoryEnabled ? "green" : "red"}>
              {config.memoryEnabled ? "On" : "Off"}
            </Text>
            <Text color={COLORS.dimText}>[E] Toggle</Text>
          </Box>
          <Box gap={1}>
            <Text>Conversations:</Text>
            <Text color={COLORS.dimText}>{config.conversationsFolder}</Text>
          </Box>
        </Box>
      </Box>
    );
  }

  // Add Provider form
  if (section === "add-provider") {
    return (
      <Box flexDirection="column" height="100%" justifyContent="center" alignItems="center">
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor={COLORS.border}
          paddingX={3}
          paddingY={1}
          width={50}
          gap={1}
        >
          <Text bold>Add Provider</Text>
          <Text color={COLORS.dimText}>
            Presets: [1]OpenAI [2]Anthropic [3]Google [4]DeepSeek [5]Custom
          </Text>

          <Box>
            <Text>Name: </Text>
            {formField === 0 ? (
              <TextInput
                value={formName}
                onChange={setFormName}
                onSubmit={() => setFormField(1)}
                focus={true}
              />
            ) : (
              <Text>{formName}</Text>
            )}
          </Box>

          <Box>
            <Text>URL:  </Text>
            {formField === 1 ? (
              <TextInput
                value={formUrl}
                onChange={setFormUrl}
                onSubmit={() => setFormField(2)}
                focus={true}
              />
            ) : (
              <Text color={COLORS.dimText}>{formUrl || "(enter name first)"}</Text>
            )}
          </Box>

          <Box>
            <Text>Key:  </Text>
            {formField === 2 ? (
              <TextInput
                value={formKey}
                onChange={setFormKey}
                onSubmit={async () => {
                  if (formName && formUrl && formKey) {
                    const id = formName.toLowerCase().replace(/\s+/g, "-");
                    await keytar.setPassword("multi-model-arena", id, formKey.trim());
                    const newProvider: ProviderConfig = {
                      id,
                      name: formName.trim(),
                      type: "custom",
                      baseUrl: formUrl.trim(),
                      isDefault: false,
                    };
                    save({ providers: [...config.providers, newProvider] });
                    setSection("main");
                  }
                }}
                mask="●"
                focus={true}
              />
            ) : (
              <Text color={COLORS.dimText}>{formKey ? "●●●●●●●●" : "(enter URL first)"}</Text>
            )}
          </Box>

          <Text color={COLORS.dimText}>Enter to advance • Esc to cancel</Text>
        </Box>
      </Box>
    );
  }

  return null;
}
```

- [ ] **Step 2: Add preset handling**

In the SettingsScreen, add input handling for preset numbers in the add-provider form. Add to the `useInput` handler:

```typescript
// Handle preset numbers in add-provider form
if (section === "add-provider" && formField === 0) {
  const presets = ["openai", "anthropic", "google", "deepseek"];
  const idx = parseInt(input) - 1;
  if (idx >= 0 && idx < presets.length) {
    const preset = PRESET_PROVIDERS[presets[idx]];
    setFormName(preset.name);
    setFormUrl(preset.url);
    setFormField(2); // skip to key field
  }
}
```

- [ ] **Step 3: Commit**

```bash
cd ~/multi-model-arena
git add src/terminal/screens/SettingsScreen.tsx
git commit -m "feat: build full SettingsScreen with providers, routing, and general settings"
```

---

### Task 10: CLI Entry Point and Desktop Launcher

**Files:**
- Modify: `bin/arena.js`
- Create: `Arena.app/Contents/MacOS/arena-launcher.sh`
- Create: `Arena.app/Contents/Info.plist`

- [ ] **Step 1: Finalize the CLI entry point**

Update `bin/arena.js`:

```javascript
#!/usr/bin/env node
import("tsx/esm/api").then(({ register }) => {
  register();
  import("../src/terminal/index.tsx");
}).catch((err) => {
  console.error("Failed to start Arena:", err.message);
  console.error("Make sure you ran: npm install");
  process.exit(1);
});
```

- [ ] **Step 2: Create macOS app launcher**

Create `Arena.app/Contents/MacOS/arena-launcher.sh`:

```bash
#!/bin/bash
# Find arena command
ARENA_PATH=$(which arena 2>/dev/null)

if [ -z "$ARENA_PATH" ]; then
  # Fallback: try common node paths
  for p in /usr/local/bin/arena "$HOME/.npm-global/bin/arena" "$HOME/.nvm/versions/node/*/bin/arena"; do
    if [ -x "$p" ]; then
      ARENA_PATH="$p"
      break
    fi
  done
fi

if [ -z "$ARENA_PATH" ]; then
  osascript -e 'display dialog "Arena not found. Run: npm install -g multi-model-arena" buttons {"OK"} default button "OK"'
  exit 1
fi

# Open Terminal.app and run arena
osascript -e "tell application \"Terminal\"
  activate
  do script \"$ARENA_PATH\"
end tell"
```

Make it executable:

```bash
chmod +x Arena.app/Contents/MacOS/arena-launcher.sh
```

- [ ] **Step 3: Create Info.plist**

Create `Arena.app/Contents/Info.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleExecutable</key>
  <string>arena-launcher.sh</string>
  <key>CFBundleName</key>
  <string>Arena</string>
  <key>CFBundleDisplayName</key>
  <string>Multi-Model Arena</string>
  <key>CFBundleIdentifier</key>
  <string>com.multi-model-arena.app</string>
  <key>CFBundleVersion</key>
  <string>2.0.0</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
</dict>
</plist>
```

- [ ] **Step 4: Link the CLI command locally for testing**

```bash
cd ~/multi-model-arena
chmod +x bin/arena.js
npm link
```

- [ ] **Step 5: Test both launch methods**

```bash
# Test CLI command
arena

# Test desktop app (open a Finder window)
open Arena.app
```

- [ ] **Step 6: Commit**

```bash
cd ~/multi-model-arena
git add bin/ Arena.app/
git commit -m "feat: add arena CLI command and macOS desktop launcher"
```

---

### Task 11: Update README and Clean Up

**Files:**
- Modify: `README.md`
- Modify: `.gitignore`

- [ ] **Step 1: Update README for terminal version**

Update `README.md` to reflect the terminal app instead of the web app. Key changes:
- Remove all web-specific instructions (npm run dev, localhost:3000, browser)
- Add terminal launch instructions (arena command, desktop app)
- Update screenshots section to describe terminal UI
- Update tech stack (Ink instead of Next.js, no Tailwind)
- Keep the backend/settings/models documentation as-is

- [ ] **Step 2: Update .gitignore**

Add to `.gitignore`:

```
dist/
*.tsbuildinfo
```

Remove Next.js specific entries:
```
# Remove these:
.next
next-env.d.ts
```

- [ ] **Step 3: Final test**

```bash
cd ~/multi-model-arena
arena
```

Test the full flow:
1. App launches in terminal
2. Model picker appears
3. Type a question
4. Models respond in parallel with colors
5. Press `d` to debate
6. Add follow-up thoughts
7. Press `s` to summarize
8. Summary appears in gold box
9. Press `c` to copy summary
10. Press `n` for new conversation
11. Press `Ctrl+S` for settings
12. Press `q` to quit

- [ ] **Step 4: Commit and push**

```bash
cd ~/multi-model-arena
git add -A
git commit -m "feat: Multi-Model Arena v2.0 - Terminal Edition"
git push origin main
```
