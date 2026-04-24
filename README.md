# Multi-Model Arena

A terminal app where multiple AI models debate each other in a single group chat. Ask a question, watch Claude, GPT, Gemini, DeepSeek, and others respond simultaneously, then debate each other. You control when to keep debating or get a summary.

## Quick Start

```bash
# Install
git clone https://github.com/sishilalala/multi-model-arena.git
cd multi-model-arena
npm install

# Run
npx tsx src/terminal/index.tsx
```

## Install as Global Command

```bash
npm install -g multi-model-arena
arena   # launches the app
```

## Desktop App (macOS)

Drag `Arena.app` to your Applications folder. Double-click to launch.

## How It Works

1. Launch the app - it opens in your terminal
2. Pick which AI models to include (up to 8)
3. Type your question
4. Watch models respond simultaneously with live streaming
5. Add your own thoughts between rounds
6. Press `d` to keep debating or `s` to get a summary
7. Conversations saved as markdown files

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Enter | Send message |
| d | Keep Debating |
| s | Summarize |
| m | Change models |
| n | New conversation |
| Ctrl+S | Settings |
| Tab | Switch sidebar/chat focus |
| r | Retry failed model |
| c | Copy summary |
| q | Quit |

## Models (via OpenRouter)

- Claude Opus 4.6 (Anthropic)
- GPT-5.4 (OpenAI)
- Gemini 3.1 Pro (Google)
- Gemini 2.5 Flash (Google) - moderator
- MiMo-V2-Pro (Xiaomi)
- Qwen 3.6 Plus (Alibaba)

Add more models and direct API providers in settings (Ctrl+S).

## Where Things Are Stored

| What | Where |
|------|-------|
| Config | ~/.multi-model-arena/config.json |
| API keys | System keychain |
| Conversations | ~/multi-model-arena/conversations/ |
| Memory | conversations/memory.md |

## Requirements

- Node.js 18+
- macOS or Linux
- OpenRouter API key (or direct provider keys)

## License

MIT
