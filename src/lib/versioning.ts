import type {
  DecisionVersion,
  DecisionVersionChange,
  DecisionVersionFamily,
  DecisionVersioning,
  LedgerAnswer,
  LedgerEntry,
} from "./types";

export const VERSIONING_NOTE =
  "A change writes a new version of the same decision. The old version stays. Together the versions are the product decision history. The current version is the latest record that was not superseded.";

export const VERSIONING_ASCII = `DEC-N v1
   │
   ↓
DEC-N v2
   │
   ↓
current`;

export const VERSION_CURRENT = "What is the current version of this decision?";
export const VERSION_HISTORY = "What is the history of this decision?";

export function versionLabel(entry: Pick<LedgerEntry, "decisionId" | "number" | "version">) {
  const id = entry.decisionId || (entry.number > 0 ? `DEC-${entry.number}` : "DEC");
  return `${id} v${entry.version ?? 1}`;
}

function reasonsOf(reason: string) {
  return reason
    .split(/\n+| · |\.\s+/)
    .map((line) => line.replace(/^[-*•]\s*/, "").trim())
    .filter((line) => line.length > 1);
}

function familyAscii(family: Omit<DecisionVersionFamily, "ascii">) {
  const cards = family.versions
    .map((item) => {
      const reasons = item.reasons.length ? item.reasons.join("\n") : "Reason was not named.";
      return `${item.id}
Decision:
${item.decision || "The new choice is still unnamed."}

Reason:
${reasons}`;
    })
    .join("\n\n   │\n   ↓\n\n");
  return `${cards}

   │
   ↓
current
${family.currentId}`;
}

function changesOf(versions: DecisionVersion[]): DecisionVersionChange[] {
  const changes: DecisionVersionChange[] = [];
  for (let index = 1; index < versions.length; index += 1) {
    const previous = versions[index - 1];
    const next = versions[index];
    if (previous.decision && next.decision && previous.decision !== next.decision) {
      changes.push({ field: "decision", before: previous.decision, after: next.decision, evidence: "stated" });
    }
    const added = next.reasons.filter((line) => !previous.reasons.some((old) => old.toLowerCase() === line.toLowerCase()));
    for (const reason of added) {
      changes.push({ field: "reason", before: previous.reasons.join(" · ") || "Unnamed.", after: reason, evidence: "stated" });
    }
  }
  return changes;
}

export function emptyDecisionVersioning(): DecisionVersioning {
  return {
    note: VERSIONING_NOTE,
    ascii: VERSIONING_ASCII,
    question: VERSION_CURRENT,
    families: [],
  };
}

export function buildVersioning(entries: LedgerEntry[]): DecisionVersioning {
  const groups = new Map<number, LedgerEntry[]>();
  for (const entry of entries) {
    if (!entry.number) continue;
    const group = groups.get(entry.number) ?? [];
    group.push(entry);
    groups.set(entry.number, group);
  }
  const families: DecisionVersionFamily[] = [...groups.entries()]
    .sort((left, right) => left[0] - right[0])
    .map(([number, group]) => {
      const ordered = [...group].sort((a, b) => (a.version ?? 1) - (b.version ?? 1));
      const current = [...ordered].reverse().find((item) => item.lifecycle !== "superseded") ?? ordered[ordered.length - 1];
      const versions: DecisionVersion[] = ordered.map((item) => ({
        id: versionLabel(item),
        decisionId: item.decisionId || `DEC-${item.number}`,
        number: item.number,
        version: item.version ?? 1,
        decision: item.decision,
        reasons: reasonsOf(item.reason),
        status: versionLabel(item) === versionLabel(current) ? "current" : "superseded",
        replacesId: item.replacesId,
        replacedById: item.replacedById,
        entryId: item.id,
      }));
      const family = {
        decisionId: current.decisionId || `DEC-${number}`,
        number,
        currentId: versionLabel(current),
        versions,
        changes: changesOf(versions),
      };
      return { ...family, ascii: familyAscii(family) };
    });
  return {
    note: VERSIONING_NOTE,
    ascii: VERSIONING_ASCII,
    question: VERSION_CURRENT,
    families,
  };
}

export function askVersioning(input: { entries: LedgerEntry[]; query: string }): LedgerAnswer {
  const query = input.query.trim();
  const board = buildVersioning(input.entries);
  const wanted = Number(/DEC-(\d+)/i.exec(query)?.[1] ?? 0);
  const family = board.families.find((item) => item.number === wanted) ?? board.families.find((item) => item.versions.length > 1) ?? board.families[0];
  if (!family) {
    return { query, kind: "version", entries: [], answer: "No decision versions are on the ledger yet." };
  }
  const current = family.versions.find((item) => item.status === "current");
  if (/history|versions of|all versions/i.test(query)) {
    const history = family.versions
      .map((item) => `${item.id}: ${item.decision || "The new choice is still unnamed."}${item.reasons.length ? ` Reason: ${item.reasons.join(" · ")}` : ""} [${item.status}]`)
      .join(" ");
    return { query, kind: "version", entries: input.entries.filter((item) => item.number === family.number), answer: history };
  }
  return {
    query,
    kind: "version",
    entries: input.entries.filter((item) => item.number === family.number && versionLabel(item) === family.currentId),
    answer: current
      ? `${current.id} is current.${current.decision ? ` ${current.decision}.` : " The new choice is still unnamed."}`
      : "No current version was named.",
  };
}
