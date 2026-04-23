# Multi-Model Arena - Design Spec

## What is this?

A local desktop app where you type a question and multiple AI models (Claude, GPT, Gemini, etc.) all respond in one group chat. The models can see each other's answers and debate. You control how deep the debate goes, and when you're ready, a moderator model summarizes everything into a clear conclusion.

It runs on your laptop only. You open it in your browser like any website, but it's completely private - only accessible from your own machine. Each person installs it on their own laptop with their own API key. No accounts, no cloud, no login.

Chat history is saved as markdown files on your computer, so you can open them in Obsidian, search them with any tool, or use them however you like.

## How it works (user experience)

### Opening the app

You double-click the app (or run a simple command). Your browser opens to the arena. You see:

- A chat area (most of the screen)
- A sidebar on the left showing your past conversations (read from your markdown files)
- A text box at the bottom to type your question

No login needed - it's your laptop, it's your app.

### First-time setup

The very first time you open the app, it asks for one thing: your OpenRouter API key. You paste it in and you're done. The key is saved securely in your computer's built-in secure storage (Keychain on Mac, Credential Manager on Windows) - not as a readable text file. You can change it anytime in settings.

### Conversation memory

The app remembers what you've talked about before. When you start a new conversation, the models receive a short summary of your recent past conversations as background context. This means:

- If you discussed investing strategies last week and now ask about retirement planning, the models know you've been exploring this topic and can build on what was discussed before.
- Only summaries are sent (not full conversation text), so it doesn't add much to the cost.
- The app automatically keeps a rolling summary of your last 10 conversations in a file called `memory.md` in your conversations folder. You can read or edit this file directly.
- You can turn this off in settings if you want completely fresh conversations every time.

### Starting a conversation

1. You type a question (in any language) and hit send
2. Your question appears in the chat
3. All default models receive your question (plus your conversation memory as background context) and start responding
4. Responses stream in one by one, group-chat style
5. Each model is labeled with its name and a distinct color (e.g., Claude in orange, GPT in green, Gemini in blue)
6. The language of your first message sets the language for the entire conversation - all models and the summary will respond in that same language

### Debating

After all models have responded, a control bar appears with:

- **"Keep Debating"** button - Each model sees what the others said and responds again. They can challenge, agree, expand, or change their position. **Maximum 10 debate rounds** - after 10 rounds, only the "Summarize" button remains.
- **"Summarize"** button - Triggers the moderator to wrap up the conversation.
- **Estimated cost for next round** - Text that reads: "Estimated cost for next round: ~$0.03. Note: the actual cost could be higher than this estimate, especially in later rounds." This is always visible before you click.
- **Round counter** - Shows "Round 2 of 10" so you always know where you are.
- **Model selector** - Checkboxes showing which models are in this conversation. You can add or remove models mid-conversation (e.g., drop a model that isn't adding value, or bring in a new one for a fresh perspective). Maximum 6 models at once.

### Getting the summary

When you hit "Summarize," a moderator model reads the full conversation and produces:

1. Brief overview of the question
2. Each model's key position (2-3 bullet points each)
3. Points of agreement
4. Points of disagreement
5. A balanced conclusion

The summary appears in the chat as a special formatted message, visually distinct from the debate messages. A **"Copy Summary"** button lets you quickly copy the conclusion to paste into notes, email, or wherever you need it.

### Chat history

- The sidebar shows all past conversations, titled by the original question
- Click any conversation to re-read it (including the debate and summary)
- Each conversation is saved as a markdown (.md) file in a folder on your computer (default: `~/multi-model-arena/conversations/`)
- You can open these files directly in Obsidian, VS Code, or any text editor
- **Delete conversations** - Click a delete button to remove a conversation (deletes the markdown file). Shows a confirmation: "Delete this conversation? This cannot be undone."
- **Clear all history** - Option in settings to wipe all your conversation files at once. Requires typing "DELETE ALL" to confirm - no accidental one-click wipes.

### What a saved conversation looks like

Each conversation becomes a readable markdown file like this:

```markdown
# What's the best way to learn investing?

*Date: 2026-04-21 14:30*
*Models: Claude Sonnet 4, GPT-4o, Gemini 2.5 Flash*
*Debate rounds: 2*

## Round 1 - Initial Responses

### Claude Sonnet 4
Start with index funds and read "The Psychology of Money"...

### GPT-4o
I'd recommend a three-step approach...

### Gemini 2.5 Flash
The most important thing is to actually start...

## Round 2 - Debate

### Claude Sonnet 4
I agree with GPT-4o on the three-step approach, but...

### GPT-4o
Gemini makes a good point about starting early, however...

### Gemini 2.5 Flash
Both of you are overlooking...

## Summary (by Claude Sonnet 4)

**Overview:** The user asked about the best approach to learning investing...

**Points of Agreement:**
- ...

**Points of Disagreement:**
- ...

**Conclusion:**
- ...
```

### Connection status

A small indicator dot in the top-right corner of the app:
- **Green dot** - Connected, everything working
- **Red dot** - No internet connection. A tooltip says: "No internet connection. Models cannot respond until connection is restored." The chat input is disabled until connection returns.

### Error handling

- If a model is down, times out, or refuses to answer, the other models continue normally. The failed model shows a grey message: "[Model name] did not respond" so you know what happened.
- If all models fail (e.g., OpenRouter is down), you see a clear error message: "Could not reach the AI service. Please try again in a moment."
- Conversations are saved to disk continuously, so even if you close the browser or the app crashes, nothing is lost.

## Settings page

### API Providers
- OpenRouter is the default provider
- You can add **unlimited additional API providers** with their own keys. Supported from day one:
  - OpenRouter (default)
  - DeepSeek direct API
  - Google AI (Gemini) direct API
  - OpenAI direct API
  - Anthropic direct API
  - Any OpenAI-compatible API endpoint (custom URL + key)
- Each provider shows a status indicator (connected / not connected / invalid key)
- When a model is available through multiple providers (e.g., DeepSeek R1 via OpenRouter AND via direct DeepSeek API), you can choose which provider to use for that model - useful if one is cheaper or faster
- All API keys are stored securely in your computer's built-in secure storage (Keychain on Mac, Credential Manager on Windows) - never in a readable text file, never sent anywhere except to the AI provider

### Default Models
- Choose which models participate in every new conversation
- Toggle models on/off with checkboxes
- Default group at launch (4 models): Claude Sonnet (latest), GPT-4o (latest), Gemini Flash (latest), DeepSeek R1
- Can go up to 6 models maximum
- Models use "latest" aliases by default - when a provider upgrades a model (e.g., Claude Sonnet 4 → Sonnet 5), you automatically get the new version without changing anything. The model selector shows "Claude Sonnet (latest)" rather than a specific version number. You can optionally pin a specific version if you prefer.

### Moderator Model
- Choose which model acts as the summarizer
- Default: Gemini 2.5 Flash (latest) - cheap and accurate for summarization
- Can be changed to any available model (Claude, GPT, DeepSeek, etc.) for important questions

### Debate Style
- **Collaborative** (default) - Models build on each other's ideas, look for the best combined answer
- **Adversarial** - Models actively challenge each other, poke holes in arguments

### Temperature
- A slider from "Focused" to "Creative"
- Controls how adventurous the models get with their responses
- Default: middle position

### Cost Tracker
- Shows total API credit used this month
- Breakdown by model
- Simple bar chart or number display
- Uses **actual usage data** returned by OpenRouter and other providers in their API responses - not just estimates. This means the numbers in the app match your real bill.

### Spending Limit
- **Monthly budget cap** - Set a maximum amount you're willing to spend per month (e.g., $10). When you hit the limit, the app stops sending requests and shows a message: "Monthly budget reached. Adjust your limit in settings to continue."
- **Per-conversation warning** - When a single conversation crosses $1 in total cost, a gentle warning appears: "This conversation has used $X so far." Shown once per threshold ($1, $5, $10, etc.)
- Default monthly cap: $20 (changeable in settings)

### Conversations Folder
- Shows where markdown files are saved (default: `~/multi-model-arena/conversations/`)
- You can change this to any folder, e.g., your Obsidian vault: `~/Documents/ObsidianVault/AI Debates/`
- When you change the folder, all existing conversation files are **automatically moved** to the new location

### Retired Models
- If a model you've selected gets retired from a provider, the app shows a notice: "⚠ [Model name] has been retired from [Provider] and is no longer accessible. Please choose a different model in settings."
- Retired models are greyed out in the model selector with a "Retired" label

## Technical architecture

### Tech stack
- **Frontend:** Next.js (React framework) with Tailwind CSS for styling
- **Backend:** Next.js API routes (server functions built into the same app)
- **Storage:** Local filesystem - markdown files for conversations, JSON file for settings
- **AI API:** OpenRouter (single API that routes to all models)
- **Runs locally:** Started with a simple command, opens in your default browser

### Data storage (all local)

**API keys** - Stored in your computer's secure storage (Mac Keychain / Windows Credential Manager), NOT in any file.

**Config file** (`~/.multi-model-arena/config.json`)
- Default models list
- Moderator model
- Debate style preference
- Temperature preference
- Monthly spending limit
- Conversations folder path
- Conversation memory on/off

**Conversations folder** (`~/multi-model-arena/conversations/` by default)
- One `.md` file per conversation
- Filename format: `2026-04-21-whats-the-best-way-to-learn-investing.md`
- Human-readable markdown that works in Obsidian, any text editor, or any markdown tool
- `memory.md` - A rolling summary of your last 10 conversations, used as background context for new conversations. Readable and editable. If this file is missing or corrupted, the app simply ignores it and starts fresh - no error, no interruption.

**Cost tracking file** (`~/.multi-model-arena/usage.json`)
- Monthly totals
- Per-conversation costs
- Per-model breakdown
- Resets each month

### How the debate works behind the scenes

1. User sends a message
2. Server detects the language of the message
3. Server sends the question to all selected models in parallel via OpenRouter
4. Each model's response streams back to the browser in real time, with a **small cost indicator** under each response showing what that individual model's response cost (e.g., "$0.004")
5. All responses are saved to the markdown file as they complete
6. When user clicks "Keep Debating":
   - Server builds a conversation history for each model: the original question + all previous responses from all models
   - Each model is prompted: "You are [model name] in a group discussion. Here's what everyone has said so far. Respond to the other models' points. Continue in [detected language]."
   - New responses stream in and get saved
7. When user clicks "Summarize":
   - The moderator model receives the full conversation
   - It produces a structured summary in the detected language
   - Summary is appended to the markdown file

### API provider architecture (for future expansion)

The system uses a "provider" pattern:
- Each API provider (OpenRouter, direct OpenAI, direct Anthropic, etc.) is a separate module
- All providers share the same interface: send a message, get a streaming response
- Adding a new provider means adding one new module and a settings field for its API key
- The app routes each model to the correct provider

## Installation (for each person)

1. Download/clone the app to your laptop
2. Run one setup command (installs everything needed)
3. Open the app, paste your OpenRouter API key
4. Start chatting

Your husband does the exact same thing on his laptop. Completely independent - his conversations, his API key, his settings.

## What's NOT in version 1

- No cloud sync between devices (each laptop has its own conversations)
- No shared conversations between users
- No file uploads (Word, Excel, etc.) - text-only for now, can be added later
- No image support
- No voice input
- No mobile app (desktop only)

These can all be added later if wanted.

## Cost to run

- **App itself:** Free. Runs on your laptop, no hosting fees.
- **AI usage:** Depends on how much you use it. OpenRouter charges per token (roughly per word). A typical question with 4 models responding + 2 debate rounds + summary costs approximately $0.05-0.30 depending on the models used. The spending limit protects you from surprises.
