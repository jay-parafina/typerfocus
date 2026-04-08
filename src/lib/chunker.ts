import { Phrase } from './types';

const CHUNK_MAX = 120; // hard cap per chunk (chars)

// ─── Core chunker ──────────────────────────────────────────────────────────

/**
 * Converts raw article text into an array of typeable phrase strings.
 *
 * Strategy:
 *  1. Normalize whitespace (newlines → spaces, collapse runs).
 *  2. Split into sentences on `. ` `! ` `? ` boundaries (lookahead so the
 *     punctuation stays with its sentence).
 *  3. Any sentence longer than CHUNK_MAX is split at word boundaries so no
 *     single chunk is unmanageably long.
 */
/**
 * Replace typographic (non-keyboard) characters with their keyboard equivalents
 * so that phrase text can always be typed on a standard keyboard.
 *
 * Common offenders in pasted web text:
 *   ' '  →  '          (curly single quotes / apostrophes)
 *   " "  →  "          (curly double quotes)
 *   —    →  --         (em dash)
 *   –    →  -          (en dash)
 *   …    →  ...        (ellipsis)
 *   \u00a0  →  space   (non-breaking space)
 */
function normalizeTypography(s: string): string {
  return s
    .replace(/[\u2018\u2019\u201A\u201B\u02BC]/g, "'")   // curly apostrophes → '
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')          // curly double quotes → "
    .replace(/\u2014|\u2015/g, '--')                      // em dash → --
    .replace(/\u2013/g, '-')                              // en dash → -
    .replace(/\u2026/g, '...')                            // ellipsis → ...
    .replace(/\u00a0/g, ' ')                              // non-breaking space → space
    .replace(/\p{Extended_Pictographic}/gu, '')            // remove all pictographic emoji (🎯, 🗣️, etc.)
    .replace(/[\u{FE00}-\u{FE0F}\u{200D}]/gu, '');        // remove variation selectors and zero-width joiners left behind
}

export function chunkArticle(raw: string): string[] {
  const text = normalizeTypography(raw)
    .replace(/[\r\n]+/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim();

  if (!text) return [];

  // Split after sentence-ending punctuation followed by whitespace.
  // Lookbehind keeps the punctuation attached to the preceding sentence.
  const sentences = text.split(/(?<=[.!?])\s+/);

  const chunks: string[] = [];

  for (const raw of sentences) {
    const s = raw.trim();
    if (!s) continue;

    if (s.length <= CHUNK_MAX) {
      chunks.push(s);
    } else {
      // Long sentence — split at word boundaries near CHUNK_MAX
      const words = s.split(' ');
      let current = '';
      for (const word of words) {
        if (!word) continue;
        if (!current) {
          current = word;
        } else if (current.length + 1 + word.length <= CHUNK_MAX) {
          current += ' ' + word;
        } else {
          chunks.push(current);
          current = word;
        }
      }
      if (current) chunks.push(current);
    }
  }

  return chunks.filter(c => c.length > 0);
}

/**
 * Converts chunk strings into Phrase objects compatible with useTypingEngine.
 * moduleId is fixed to 'read' since these aren't persisted.
 */
export function chunksToPhphrases(chunks: string[]): Phrase[] {
  return chunks.map((text, i) => ({
    id: `read-chunk-${i}`,
    moduleId: 'read',
    text,
    order: i + 1,
  }));
}

// ─── Preview stats (shown live in input state) ─────────────────────────────

export interface ArticleStats {
  wordCount: number;
  chunkCount: number;
  /** Estimated typing time in minutes at ~50 wpm */
  estimatedMinutes: number;
}

export function getArticleStats(raw: string): ArticleStats {
  const trimmed = raw.trim();
  if (!trimmed) return { wordCount: 0, chunkCount: 0, estimatedMinutes: 0 };

  const wordCount = trimmed.split(/\s+/).length;
  const chunks = chunkArticle(trimmed);
  const estimatedMinutes = Math.max(1, Math.round(wordCount / 50)); // 50 wpm

  return { wordCount, chunkCount: chunks.length, estimatedMinutes };
}
