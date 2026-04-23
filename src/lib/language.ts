export type Language = "Chinese" | "Japanese" | "Korean" | "Arabic" | "Russian" | "Thai" | "English";

/**
 * Detect language from text by scanning Unicode character ranges.
 * Returns the dominant language found, defaulting to English.
 */
export function detectLanguage(text: string): Language {
  let cjkCount = 0;
  let hiraganaKatakanaCount = 0;
  let hangulCount = 0;
  let arabicCount = 0;
  let cyrillicCount = 0;
  let thaiCount = 0;

  for (const ch of text) {
    const cp = ch.codePointAt(0) ?? 0;

    // CJK Unified Ideographs (and extensions)
    if (
      (cp >= 0x4e00 && cp <= 0x9fff) ||
      (cp >= 0x3400 && cp <= 0x4dbf) ||
      (cp >= 0x20000 && cp <= 0x2a6df) ||
      (cp >= 0xf900 && cp <= 0xfaff)
    ) {
      cjkCount++;
    }
    // Hiragana (3040–309F) and Katakana (30A0–30FF)
    else if ((cp >= 0x3040 && cp <= 0x309f) || (cp >= 0x30a0 && cp <= 0x30ff)) {
      hiraganaKatakanaCount++;
    }
    // Hangul Syllables (AC00–D7AF) and Jamo (1100–11FF)
    else if ((cp >= 0xac00 && cp <= 0xd7af) || (cp >= 0x1100 && cp <= 0x11ff)) {
      hangulCount++;
    }
    // Arabic (0600–06FF)
    else if (cp >= 0x0600 && cp <= 0x06ff) {
      arabicCount++;
    }
    // Cyrillic (0400–04FF)
    else if (cp >= 0x0400 && cp <= 0x04ff) {
      cyrillicCount++;
    }
    // Thai (0E00–0E7F)
    else if (cp >= 0x0e00 && cp <= 0x0e7f) {
      thaiCount++;
    }
  }

  // Japanese is identified by the presence of hiragana/katakana (possibly mixed with CJK)
  if (hiraganaKatakanaCount > 0) return "Japanese";

  // Find the dominant non-Latin script
  const scores: [number, Language][] = [
    [cjkCount, "Chinese"],
    [hangulCount, "Korean"],
    [arabicCount, "Arabic"],
    [cyrillicCount, "Russian"],
    [thaiCount, "Thai"],
  ];

  let best: Language = "English";
  let bestScore = 0;
  for (const [score, lang] of scores) {
    if (score > bestScore) {
      bestScore = score;
      best = lang;
    }
  }

  return best;
}
