export function clip(text: string, max: number) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trim()}…`;
}

export function lowerFirst(text: string) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return clean;
  const [first, ...rest] = clean.split(" ");
  const head = first.length <= 5 && first === first.toUpperCase() ? first : first.charAt(0).toLowerCase() + first.slice(1);
  return [head, ...rest].join(" ");
}

export function singularRole(role: string) {
  const trimmed = role.trim();
  if (/ss$/i.test(trimmed)) return trimmed;
  if (/ies$/i.test(trimmed)) return trimmed.replace(/ies$/i, "y");
  if (/[^s]s$/i.test(trimmed)) return trimmed.replace(/s$/i, "");
  return trimmed;
}

const STOP = new Set([
  "with",
  "that",
  "this",
  "from",
  "have",
  "must",
  "should",
  "their",
  "there",
  "about",
  "into",
  "when",
  "your",
  "they",
  "them",
  "will",
  "after",
  "before",
  "under",
  "each",
  "full",
  "want",
  "need",
  "able",
  "using",
  "used",
  "than",
  "then",
  "also",
  "only",
  "been",
  "were",
  "what",
  "which",
  "where",
  "while",
  "because",
  "without",
  "within",
  "every",
  "other",
  "the",
  "and",
  "for",
  "are",
  "was",
  "you",
  "our",
  "per",
  "day",
  "who",
  "how",
  "not",
  "but",
  "can",
  "all",
  "any",
  "its",
  "via",
  "has",
  "had",
  "out",
  "off",
  "too",
  "own",
  "one",
  "two",
  "new",
  "now",
  "may",
  "let",
  "why",
  "use",
]);

export function contentWords(text: string) {
  return (
    text
      .toLowerCase()
      .match(/[a-z][a-z0-9-]{2,}/g)
      ?.filter((word) => !STOP.has(word)) ?? []
  );
}

export function round1(value: number) {
  return Math.round(value * 10) / 10;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
