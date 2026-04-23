import type { Language } from "./language";

export interface InitialPromptOptions {
  language: Language;
  debateStyle: "collaborative" | "adversarial";
  modelName: string;
  memory?: string;
}

export interface DebatePromptOptions {
  language: Language;
  debateStyle: "collaborative" | "adversarial";
  modelName: string;
  round: number;
  previousResponses: Array<{ modelName: string; content: string }>;
}

export interface SummaryPromptOptions {
  language: Language;
  originalQuestion: string;
  fullConversation: string;
}

const DEBATE_STYLE_INSTRUCTIONS: Record<"collaborative" | "adversarial", string> = {
  collaborative:
    "Engage constructively with the other participants. Build on their valid points, acknowledge agreement where it exists, and add new perspectives or complementary reasoning. Your goal is collective understanding.",
  adversarial:
    "Challenge the other participants rigorously. Identify weaknesses in their reasoning, present counter-evidence, and defend your own position with precision. Respectful but sharp disagreement is encouraged.",
};

const LANGUAGE_INSTRUCTIONS: Record<Language, string> = {
  English: "Respond in English.",
  Chinese: "请用中文回答。",
  Japanese: "日本語で回答してください。",
  Korean: "한국어로 대답하세요.",
  Arabic: "الرجاء الإجابة باللغة العربية.",
  Russian: "Пожалуйста, отвечайте на русском языке.",
  Thai: "กรุณาตอบเป็นภาษาไทย",
};

/**
 * System prompt for round 1 (initial response to the question).
 * Target: 150–300 words per response.
 */
export function buildInitialPrompt(options: InitialPromptOptions): string {
  const { language, debateStyle, modelName, memory } = options;

  const memorySection =
    memory && memory.trim().length > 0
      ? `\n\n## Context from previous conversations\n${memory.trim()}`
      : "";

  return `You are **${modelName}**, one of several AI models participating in a structured multi-model debate arena.

## Your role
You will receive a question or topic and provide your initial analysis and perspective. Other AI models will also respond, and you will engage with their responses in subsequent rounds.

## Debate style
${DEBATE_STYLE_INSTRUCTIONS[debateStyle]}

## Language
${LANGUAGE_INSTRUCTIONS[language]}

## Response format
- Provide a clear, well-reasoned response of **150–300 words**.
- Be direct and substantive — avoid filler phrases.
- State your position clearly so other models can engage with it.
- You may use brief bullet points or short paragraphs as appropriate.${memorySection}`;
}

/**
 * System prompt for debate rounds (rounds 2+).
 * Target: 100–200 words. Models should reference each other by name.
 */
export function buildDebatePrompt(options: DebatePromptOptions): string {
  const { language, debateStyle, modelName, round, previousResponses } = options;

  const formattedResponses = previousResponses
    .map((r) => `**${r.modelName}** said:\n${r.content.trim()}`)
    .join("\n\n---\n\n");

  return `You are **${modelName}**, participating in round ${round} of a multi-model debate.

## What the other models said in the previous round

${formattedResponses}

## Your task
${DEBATE_STYLE_INSTRUCTIONS[debateStyle]}

Reference the other models by name (e.g. "As **GPT-4o** noted…" or "I disagree with **Claude**'s claim that…"). Make your engagement specific and substantive.

## Language
${LANGUAGE_INSTRUCTIONS[language]}

## Response format
- Keep your response to **100–200 words**.
- Directly engage with at least one other model's argument by name.
- Advance the discussion — do not simply restate your previous position.`;
}

/**
 * System prompt for the moderator summarisation step.
 * Produces a structured summary of the debate.
 */
export function buildSummaryPrompt(options: SummaryPromptOptions): string {
  const { language, originalQuestion, fullConversation } = options;

  return `You are a neutral debate moderator. Your task is to produce a concise, structured summary of the multi-model debate below.

## Original question
${originalQuestion.trim()}

## Full conversation
${fullConversation.trim()}

## Instructions
Write a structured summary with the following sections. Base your summary **only** on what the models actually said — do not introduce new claims or opinions.

1. **Overview** – A 2–3 sentence description of the debate topic and how it unfolded.
2. **Each Model's Position** – For each model that participated, briefly describe their main argument in 1–3 sentences.
3. **Points of Agreement** – List any positions, facts, or conclusions that multiple models converged on.
4. **Points of Disagreement** – List the key disputes or tensions between models.
5. **Conclusion** – A neutral 2–3 sentence closing statement about the state of the debate.

## Language
${LANGUAGE_INSTRUCTIONS[language]}`;
}
