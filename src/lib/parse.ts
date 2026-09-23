export type Section = {
  heading: string;
  key: string;
  paragraphs: string[];
  bullets: string[];
};

export type ParsedDoc = {
  title: string | null;
  preamble: string;
  sections: Section[];
  raw: string;
};

const BARE_HEADING =
  /^(problem|users|personas|must have.*|should have.*|nice to have.*|later\b.*|constraints?|success|non-?goals?|out of scope|existing product|request)\b/i;

export function keyFor(heading: string) {
  const h = heading.toLowerCase();
  if (/non-?goal|out of scope|won'?t/.test(h)) return "nongoals";
  if (/must|\bmvp\b|\bv1\b|required/.test(h)) return "must";
  if (/should/.test(h)) return "should";
  if (/nice|later|\bcould\b|future/.test(h)) return "later";
  if (/user|persona/.test(h)) return "users";
  if (/constraint/.test(h)) return "constraints";
  if (/success|metric/.test(h)) return "success";
  if (/problem/.test(h)) return "problem";
  if (/existing/.test(h)) return "existing";
  if (/request|idea/.test(h)) return "request";
  return "other";
}

export function parseDocument(text: string): ParsedDoc {
  const raw = text.replace(/\r\n/g, "\n").trim();
  const lines = raw.split("\n");
  let title: string | null = null;
  const sections: Section[] = [];
  const loose: string[] = [];
  let current: Section | null = null;
  let buffer: string[] = [];
  let preambleBuffer: string[] = [];
  let seenHeading = false;

  function flush() {
    const paragraph = buffer.join(" ").replace(/\s+/g, " ").trim();
    buffer = [];
    if (!paragraph) return;
    if (current) current.paragraphs.push(paragraph);
    else preambleBuffer.push(paragraph);
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      flush();
      seenHeading = true;
      if (heading[1].length === 1 && !title) title = heading[2].trim();
      current = { heading: heading[2].trim(), key: keyFor(heading[2]), paragraphs: [], bullets: [] };
      sections.push(current);
      continue;
    }
    if (!line) {
      flush();
      continue;
    }
    if (!seenHeading && BARE_HEADING.test(line) && line.length < 80 && !/[.!?]$/.test(line)) {
      flush();
      seenHeading = true;
      current = { heading: line, key: keyFor(line), paragraphs: [], bullets: [] };
      sections.push(current);
      continue;
    }
    if (seenHeading && BARE_HEADING.test(line) && line.length < 80 && !/[.!?]$/.test(line)) {
      flush();
      current = { heading: line, key: keyFor(line), paragraphs: [], bullets: [] };
      sections.push(current);
      continue;
    }
    const bullet = /^(?:[-*•]|\d+[.)])\s+(.+)$/.exec(line);
    if (bullet) {
      flush();
      const target = current ? current.bullets : loose;
      target.push(bullet[1].trim());
      continue;
    }
    buffer.push(line);
  }
  flush();

  if (!seenHeading && loose.length) {
    sections.push({
      heading: "Notes",
      key: "other",
      paragraphs: [],
      bullets: loose,
    });
  }

  return {
    title,
    preamble: preambleBuffer.join("\n\n").trim(),
    sections,
    raw,
  };
}

export function section(doc: ParsedDoc, key: string): Section {
  const matches = doc.sections.filter((item) => item.key === key);
  return {
    heading: matches[0]?.heading ?? key,
    key,
    paragraphs: matches.flatMap((item) => item.paragraphs),
    bullets: matches.flatMap((item) => item.bullets),
  };
}

export function sectionBody(doc: ParsedDoc, key: string) {
  const found = section(doc, key);
  return [...found.paragraphs, ...found.bullets];
}
