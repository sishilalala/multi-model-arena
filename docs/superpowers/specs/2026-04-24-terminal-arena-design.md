# Terminal Arena - Design Spec

## What is this?

A terminal-based version of Multi-Model Arena that replaces the web app. Same features, same backend, but runs entirely in your terminal with a rich UI - split panels, borders, scrollable areas, bright colors on a dark background.

You type `arena` to launch it, or double-click a desktop icon. No browser needed.

## How it works

### Launching

Two ways to start:
- Type `arena` in any terminal
- Double-click a desktop app icon (opens Terminal.app and runs `arena` automatically)

### First-time setup

If no OpenRouter API key is stored, a centered prompt appears:

```
┌──────────── Welcome to Arena ─────────────┐
│                                            │
│  ⚔  Multi-Model Arena                     │
│                                            │
│  Paste your OpenRouter API key to start.   │
│                                            │
│  Key: ●●●●●●●●●●●●●●●●●●●                 │
│                                            │
│  [Enter] Save    [Q] Quit                  │
└────────────────────────────────────────────┘
```

After saving, you go straight to the model picker.

### Model picker (before each conversation)

Every time you start a new conversation, a checklist appears:

```
┌────────────── Select Models (max 8) ──────────────────┐
│                                                        │
│  [x] Claude Opus 4.6          [x] MiMo-V2-Pro        │
│  [x] GPT-5.4                  [ ] Qwen 3.6 Plus      │
│  [x] Gemini 3.1 Pro           [x] Kimi K2.6          │
│  [ ] Gemini 2.5 Flash         [x] DeepSeek Reasoner  │
│  [ ] Seed 2.0 Pro                                     │
│                                                        │
│  ↑↓ Navigate  Space Toggle  Enter Start  Esc Cancel   │
└────────────────────────────────────────────────────────┘
```

- Pre-checked models come from your saved defaults
- Navigate with arrow keys, toggle with space bar
- Enter to start, Esc to cancel
- Shows custom models from all providers alongside built-in OpenRouter models

### Main screen layout

```
┌── History ──┐┌─────────────────── Arena ──────────────────────┐
│             ││                                                │
│ > Conv 1    ││  You: What is the nature of consciousness?     │
│   Conv 2    ││                                                │
│   Conv 3    ││  ● Claude Opus 4.6                             │
│   Conv 4    ││  I believe consciousness involves a deep       │
│             ││  interplay between subjective experience and   │
│             ││  information processing...                     │
│             ││                                                │
│             ││  ● GPT-5.4                                     │
│             ││  From a computational perspective, we can      │
│             ││  understand consciousness as...                │
│             ││                                                │
│             ││  ● DeepSeek Reasoner                           │
│             ││  Let me reason through this step by step...    │
│             ││                                                │
│             ││  ● Gemini 3.1 Pro                              │
│             ││  Thinking... ███░░░░                           │
│             ││                                                │
│             ││──────────────────────────────────────────────  │
│             ││  Round 1/10  [D]ebate  [S]ummarize  [M]odels  │
│ [S]ettings  │├────────────────────────────────────────────────┤
│ [N]ew       ││ > Type your thoughts...                        │
└─────────────┘└────────────────────────────────────────────────┘
```

**Left panel (sidebar):**
- Scrollable list of past conversations, titled by the original question
- Navigate with arrow keys when sidebar is focused
- Active conversation highlighted
- Press `Delete` or `x` on a conversation to delete (with confirmation)
- Press `n` to start a new conversation
- Press `Ctrl+S` to open settings

**Main panel (chat):**
- Scrollable chat area with all messages
- Your messages in bright white
- Each model's name and response in its own distinct bright color
- Streaming responses show text appearing in real time, all models simultaneously
- Models that fail show dim text: "[Model name] did not respond [R]etry"
- Summary appears in a yellow/gold bordered box

**Control bar:**
- Appears between chat and input after models respond
- Shows round counter: "Round 1/10"
- Keyboard shortcuts: `d` for debate, `s` for summarize, `m` to open model picker
- Disappears after summary is generated

**Input area:**
- Always visible at the bottom
- Type your question or follow-up thoughts
- Enter to send
- Active during debates so you can add your input between rounds
- Shows "Start a new conversation with [N]" when a conversation is summarized

### Live streaming

All models respond simultaneously. While streaming:
- Each model's section shows text appearing word by word
- Models that haven't started yet show "Thinking..."
- Models that finish early show their complete response while others continue
- A progress indicator shows how many models have finished: "3/5 models responded"

### Keyboard shortcuts

| Key | Action |
|-----|--------|
| Enter | Send message |
| d | Keep Debating (next round) |
| s | Summarize |
| m | Open model picker for current conversation |
| n | New conversation (opens model picker) |
| Ctrl+S | Open settings |
| Tab | Switch focus between sidebar and chat |
| Up/Down | Scroll (in focused panel) |
| Delete/x | Delete selected conversation (in sidebar) |
| r | Retry failed model |
| q / Ctrl+C | Quit |

Note: Single-letter shortcuts (d, s, m, n, r) only work when the input area is empty. When you're typing a message, all keys go to the input.

### Settings screen

Pressing `Ctrl+S` replaces the main view with a full settings screen:

```
┌─────────────────── Settings ──────────────────────────┐
│                                                        │
│  API Providers                                         │
│  ─────────────                                         │
│  ● OpenRouter          Connected                       │
│  ● Kimi                Connected                       │
│  ● DeepSeek            Connected                       │
│  ● Seedance            No key                          │
│                                                        │
│  [A] Add Provider  [E] Edit Key  [R] Remove            │
│                                                        │
│  Model Routing                                         │
│  ─────────────                                         │
│  Claude Opus 4.6       → OpenRouter                    │
│  GPT-5.4               → OpenRouter                    │
│  DeepSeek Reasoner     → DeepSeek Direct               │
│  Kimi K2.6             → Kimi Direct                   │
│                                                        │
│  [C] Change provider for selected model                │
│                                                        │
│  Custom Models                                         │
│  ─────────────                                         │
│  [A] Add Model  [R] Remove Model                       │
│                                                        │
│  Default Models                                        │
│  ─────────────                                         │
│  Toggle defaults with Space (same as model picker)     │
│                                                        │
│  Moderator: Gemini 2.5 Flash          [C] Change       │
│  Debate Style: Collaborative          [C] Toggle       │
│  Temperature: 1.0                     [←→] Adjust      │
│  Memory: On                           [Space] Toggle   │
│  Conversations: ~/multi-model-arena/conversations/     │
│  Max Rounds: 10                       [←→] Adjust      │
│                                                        │
│  [Esc] Back to chat                                    │
└────────────────────────────────────────────────────────┘
```

Settings changes apply immediately - no restart needed.

**Add Provider form:**
```
┌──────────── Add Provider ─────────────┐
│                                        │
│  Presets: [1]OpenAI [2]Anthropic       │
│  [3]Google [4]DeepSeek [5]Custom       │
│                                        │
│  Name: _                               │
│  URL:  _                               │
│  Key:  _                               │
│                                        │
│  [Enter] Save    [Esc] Cancel          │
└────────────────────────────────────────┘
```

Selecting a preset auto-fills the Name and URL fields.

**Add Custom Model form:**
```
┌──────────── Add Model ────────────────┐
│                                        │
│  Provider: [↑↓ to select]             │
│  > OpenRouter                          │
│    Kimi                                │
│    DeepSeek                            │
│                                        │
│  Model ID: _                           │
│  Display Name: _                       │
│                                        │
│  [Enter] Save    [Esc] Cancel          │
└────────────────────────────────────────┘
```

### Summary display

When you press `s` to summarize:

```
│  ╔══════════════════════════════════════════╗  │
│  ║  ✦ SUMMARY by Gemini 2.5 Flash         ║  │
│  ╠══════════════════════════════════════════╣  │
│  ║                                          ║  │
│  ║  Overview: The models debated whether... ║  │
│  ║                                          ║  │
│  ║  Claude: Argued that...                  ║  │
│  ║  GPT-5: Countered with...               ║  │
│  ║  DeepSeek: Took the position that...    ║  │
│  ║                                          ║  │
│  ║  Agreement: All models agreed that...    ║  │
│  ║  Disagreement: Claude and GPT differed  ║  │
│  ║  on...                                   ║  │
│  ║                                          ║  │
│  ║  Conclusion: The strongest argument...   ║  │
│  ║                                          ║  │
│  ║           [C] Copy to clipboard          ║  │
│  ╚══════════════════════════════════════════╝  │
```

Press `c` to copy the full summary text to your clipboard.

### Continuing past conversations

When you select a past conversation from the sidebar:
- The full conversation loads with all messages displayed as individual model responses (not raw markdown)
- If the conversation was not yet summarized, the control bar appears with debate/summarize options
- If it was already summarized, the input shows "Start a new conversation with [N]"
- You can continue debating from where you left off

### Connection status

A small indicator in the top-right corner of the main panel:
- Green dot when online
- Red dot + "OFFLINE" when no internet
- Checks every 30 seconds

### Error handling

- Failed models show: `[Model name] did not respond [R]etry`
- Press `r` to retry the failed model
- 90-second timeout per model
- If all models fail: "Could not reach any AI service. Check your internet connection."

### Conversation memory

Same as web app:
- Rolling summary of last 10 conversations in `memory.md`
- Updated automatically after each summary
- Models receive this context when starting new conversations
- Can be toggled off in settings

### Chat history as markdown

Same as web app:
- Every conversation saved as a `.md` file
- Configurable folder (default: `~/multi-model-arena/conversations/`)
- Files readable in Obsidian or any text editor
- Changing the folder in settings auto-moves existing files

## Theme (dark mode)

| Element | Color |
|---------|-------|
| Background | #1a1a1a (near black) |
| Sidebar background | #2a2a2a (slightly lighter) |
| Borders | #444444 (dim gray) |
| Your messages | Bright white |
| Claude | Bright orange (#FF9500) |
| GPT-5 | Bright green (#00FF88) |
| Gemini | Bright blue (#00AAFF) |
| DeepSeek | Bright red (#FF4444) |
| MiMo | Bright magenta (#FF66FF) |
| Qwen | Bright purple (#AA88FF) |
| Kimi | Bright cyan (#00DDDD) |
| Seed | Bright yellow (#FFDD00) |
| Summary border | Gold/yellow (#FFD700) |
| Dim/inactive text | #666666 |
| Input area border | #555555, brightens when focused |

## Technical architecture

### What stays the same
- `src/lib/config.ts` - Config management
- `src/lib/models.ts` - Model definitions
- `src/lib/providers/` - All provider modules (OpenRouter, Anthropic, OpenAI-compatible, etc.)
- `src/lib/conversations.ts` - Markdown file management
- `src/lib/memory.ts` - Conversation memory
- `src/lib/prompts.ts` - System prompts for debate and summary
- `src/lib/language.ts` - Language detection
- `src/lib/usage.ts` - Usage tracking
- `~/.multi-model-arena/config.json` - Config file
- API keys in macOS Keychain via keytar

### What's new
- Terminal UI built with **Ink** (React for terminals) + **ink-ui** components
- CLI entry point that imports from `src/lib/` directly (no HTTP server, no API routes)
- Global `arena` command via npm global install
- macOS `.app` wrapper that opens Terminal.app and runs `arena`

### What's removed
- Next.js framework
- All React web components (`src/components/`)
- All API routes (`src/app/api/`)
- All web pages (`src/app/page.tsx`, `src/app/settings/page.tsx`)
- Tailwind CSS
- Web-specific dependencies

### New dependencies
- `ink` - React renderer for terminal UIs
- `ink-text-input` - Text input component for Ink
- `ink-select-input` - Select/checklist component
- `ink-spinner` - Loading spinners
- `ink-big-text` - Large text for welcome screen
- `cli-clipboard` - Copy to clipboard from terminal

### File structure (new)
```
multi-model-arena/
├── src/
│   ├── lib/              # UNCHANGED - all backend logic
│   │   ├── config.ts
│   │   ├── models.ts
│   │   ├── providers/
│   │   ├── conversations.ts
│   │   ├── memory.ts
│   │   ├── prompts.ts
│   │   ├── language.ts
│   │   └── usage.ts
│   └── terminal/         # NEW - terminal UI
│       ├── index.tsx      # Entry point, app shell
│       ├── App.tsx        # Main app component with panel layout
│       ├── screens/
│       │   ├── Chat.tsx       # Main chat screen
│       │   ├── Settings.tsx   # Settings screen
│       │   └── Setup.tsx      # First-time API key setup
│       ├── components/
│       │   ├── Sidebar.tsx        # Conversation history panel
│       │   ├── ChatArea.tsx       # Scrollable message area
│       │   ├── MessageBubble.tsx  # Single model response
│       │   ├── SummaryBox.tsx     # Gold-bordered summary
│       │   ├── ControlBar.tsx     # Debate/Summarize controls
│       │   ├── InputBar.tsx       # Text input at bottom
│       │   ├── ModelPicker.tsx    # Checkbox model selector
│       │   ├── StatusDot.tsx      # Connection indicator
│       │   └── ProviderForm.tsx   # Add/edit provider form
│       └── hooks/
│           ├── useChat.ts         # Chat state + streaming logic
│           ├── useConversations.ts # Conversation list management
│           └── useConnection.ts   # Online/offline detection
├── bin/
│   └── arena.js           # CLI entry: #!/usr/bin/env node
├── Arena.app/              # macOS app wrapper
│   └── Contents/
│       └── MacOS/
│           └── arena-launcher.sh
├── package.json
└── tsconfig.json
```

### Installation

**As a command:**
```bash
npm install -g multi-model-arena
arena   # launches the app
```

**Desktop icon (macOS):**
The build creates an `Arena.app` bundle that you drag to `/Applications`. Double-clicking it opens Terminal.app and runs the `arena` command. The icon uses a simple swords emoji or custom icon.

## What's NOT in terminal version 1

- No mouse support (keyboard only)
- No image/file viewing
- No split-column view (full width only)
- No themes (dark mode only)
- No web fallback

These can be added later if wanted.
