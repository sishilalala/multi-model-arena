# Multi-Model Arena

A local desktop app where multiple AI models debate each other in a single group chat. Ask a question, watch Claude, GPT, Gemini, DeepSeek, and others respond simultaneously, then debate each other. You control when to keep debating or get a summary.

## What it does

1. You type a question
2. Multiple AI models respond at the same time in a group chat
3. You read their answers, optionally add your own thoughts
4. Click "Keep Debating" to have models challenge and build on each other
5. Click "Summarize" to get a moderator summary of all positions
6. Conversations are saved as markdown files you can open in Obsidian or any editor

## Features

- **Parallel responses** - All models answer simultaneously, not one at a time
- **Debate control** - You decide when to go deeper or wrap up (max 10 rounds)
- **Your input matters** - Add your own thoughts between debate rounds
- **Conversation memory** - Models remember context from your past conversations
- **Markdown export** - Every conversation saved as a clean .md file
- **Multi-provider** - Use OpenRouter for everything, or add direct API keys from DeepSeek, Kimi, ByteDance, etc.
- **Secure** - API keys stored in your system keychain (macOS Keychain / Windows Credential Manager), never in files
- **Warm UI** - Clean, Claude-inspired design with terracotta accents

## Default models (via OpenRouter)

- Claude Opus 4.6 (Anthropic)
- GPT-5.4 (OpenAI)
- Gemini 3.1 Pro (Google)
- Gemini 2.5 Flash (Google) - moderator/summarizer
- MiMo-V2-Pro (Xiaomi)
- Qwen 3.6 Plus (Alibaba)

You can add more models and providers in settings (up to 8 active at once).

## Setup

### Prerequisites

- Node.js 18+
- An [OpenRouter](https://openrouter.ai/) API key (gives access to all major models through one key)

### Install

```bash
git clone https://github.com/YOUR_USERNAME/multi-model-arena.git
cd multi-model-arena
npm install
```

### Run

```bash
npm run dev
```

Open http://localhost:3000 in your browser. On first launch, paste your OpenRouter API key and you're ready to go.

### Add more providers (optional)

In Settings > API Providers, you can add direct API keys from:
- DeepSeek (https://api.deepseek.com/v1)
- Kimi/Moonshot (https://api.moonshot.cn/v1)
- ByteDance Seed (https://ark.cn-beijing.volces.com/api/v3)
- OpenAI direct (https://api.openai.com/v1)
- Anthropic direct
- Google AI direct
- Any OpenAI-compatible endpoint

## Where things are stored

| What | Where |
|------|-------|
| Config | `~/.multi-model-arena/config.json` |
| API keys | System keychain (not in any file) |
| Conversations | `~/multi-model-arena/conversations/` (configurable) |
| Memory | `conversations/memory.md` |

## Settings

- **Default models** - Choose which models participate in every conversation
- **Moderator** - Which model writes the summary (default: Gemini 2.5 Flash - cheap and accurate)
- **Debate style** - Collaborative (models build on each other) or Adversarial (models challenge each other)
- **Temperature** - Focused to Creative slider
- **Conversation memory** - Toggle on/off; models remember context from last 10 conversations
- **Conversations folder** - Point to your Obsidian vault or any folder

## Tech stack

- Next.js 16 (React 19)
- Tailwind CSS 4
- TypeScript
- OpenAI SDK (OpenAI-compatible, works with all providers)
- keytar (system keychain for API keys)

## License

MIT
