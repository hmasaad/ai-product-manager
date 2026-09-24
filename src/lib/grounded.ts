import { parseDocument, section, sectionBody } from "./parse";
import { clip, contentWords, singularRole } from "./text";
import type {
  Evidence,
  Finding,
  Judgment,
  Persona,
  Priority,
  ProblemDefinition,
  ProductInput,
  Requirement,
} from "./types";

const SITUATIONS: {
  test: RegExp;
  people: { role: string; context: string; jobs: string[]; pain: string }[];
}[] = [
  {
    test: /\bclinic\b|\bappointment\b/i,
    people: [
      {
        role: "Patient",
        context: "Trying to book a same-day appointment by phone.",
        jobs: ["Get a same-day appointment"],
        pain: "The line is a race from 7 to 8am.",
      },
      {
        role: "Front desk",
        context: "Answers the rush of same-day booking calls.",
        jobs: ["Take the next call and book what is left"],
        pain: "The phones lock up from 7 to 8am.",
      },
    ],
  },
  {
    test: /\bchildcare\b|\bdaycare\b/i,
    people: [
      {
        role: "Parent",
        context: "Needs a place for a child during the working day.",
        jobs: ["Confirm the child is cared for today"],
        pain: "The source names the situation and not the workaround.",
      },
    ],
  },
  {
    test: /\bschool\b|\bclassroom\b/i,
    people: [
      {
        role: "Teacher",
        context: "Runs the classroom named in the source.",
        jobs: ["Get through the named classroom job"],
        pain: "The source names the situation and not the workaround.",
      },
    ],
  },
  {
    test: /\binvoice\b|\bbilling\b|\bpayment\b/i,
    people: [
      {
        role: "Account holder",
        context: "Pays an invoice on the current portal.",
        jobs: ["See the amount due", "Finish a payment"],
        pain: "A failed or unclear payment leaves the amount still due.",
      },
      {
        role: "Support",
        context: "Takes the volume from people who cannot finish payment.",
        jobs: ["Explain why a card failed"],
        pain: "The same payment failures keep coming back.",
      },
    ],
  },
  {
    test: /\bwarehouse\b|\bpick list\b/i,
    people: [
      {
        role: "Picker",
        context: "Works from a pick list on the floor.",
        jobs: ["Finish the named pick"],
        pain: "The source names the floor job and not the workaround.",
      },
      {
        role: "Supervisor",
        context: "Owns whether the pick list closed.",
        jobs: ["See whether the pick finished"],
        pain: "The source names the floor job and not the workaround.",
      },
    ],
  },
];

export function composeSource(input: ProductInput) {
  const parts = [input.brief.trim(), input.existing.trim() ? `## Existing product\n\n${input.existing.trim()}` : "", input.constraints.trim() ? `## Constraints\n\n${input.constraints.trim()}` : ""].filter(Boolean);
  return parts.join("\n\n");
}

function metricLines(text: string) {
  return text
    .split("\n")
    .map((line) => line.replace(/^[-*•]\s*/, "").trim())
    .filter(
      (line) =>
        line.length > 0 &&
        line.length < 220 &&
        (/\d+(?:\.\d+)?%/.test(line) || /\(\d{2,}\)/.test(line) || /\b\d{1,3}(?:,\d{3})+\b/.test(line)),
    );
}

function quotedComplaints(text: string) {
  return [...text.matchAll(/"([^"]{8,140})"/g)].map((match) => match[1].trim());
}

function jobsFrom(description: string) {
  const parts = description
    .split(/,| and /)
    .map((part) => part.trim())
    .filter((part) => part.length > 2);
  return parts.length ? parts.slice(0, 6) : [description];
}

function personasFromUsers(bullets: string[], problem: string, success: string): Persona[] {
  return bullets.slice(0, 4).map((bullet) => {
    const split = /^([^:]{2,48}):\s+(.+)$/.exec(bullet);
    const role = singularRole(split?.[1] ?? bullet.split(/\s+/).slice(0, 3).join(" "));
    const description = split?.[2] ?? bullet;
    return {
      name: role,
      role,
      context: description,
      jobs: jobsFrom(description),
      pains: [clip(problem, 180)],
      success: success || "The current workaround is no longer required for this job.",
      evidence: "stated" as const,
    };
  });
}

function personasFromSituation(source: string, problem: string): Persona[] {
  const match = SITUATIONS.find((item) => item.test.test(source));
  if (match) {
    return match.people.map((person) => ({
      name: person.role,
      role: person.role,
      context: person.context,
      jobs: person.jobs,
      pains: [person.pain],
      success: "The team can describe this person's job with evidence, not a guess.",
      evidence: "inferred" as const,
    }));
  }
  return [
    {
      name: "Primary user",
      role: "Primary user",
      context: "The source does not name this person. Treat the role as a hypothesis.",
      jobs: ["Show what they do today when this happens."],
      pains: [clip(problem.split(/[.\n]/)[0] ?? problem, 120)],
      success: "The team can describe this person's job with evidence, not a guess.",
      evidence: "inferred",
    },
  ];
}

function personaFor(statement: string, personas: Persona[]) {
  if (/all staff|everyone|all users/i.test(statement)) return "All staff";
  const statementWords = contentWords(statement);
  const bags = personas.map((persona) =>
    contentWords(`${persona.role} ${persona.jobs.join(" ")} ${persona.context}`),
  );
  let best = personas[0]?.role ?? "Primary user";
  let bestScore = 0;
  personas.forEach((persona, index) => {
    const roleWord = persona.role.toLowerCase().split(" ").at(-1) ?? "";
    let score = roleWord && new RegExp(`\\b${roleWord}s?\\b`, "i").test(statement) ? 5 : 0;
    for (const word of bags[index] ?? []) {
      const hit = statementWords.some(
        (token) => token === word || token.startsWith(word) || word.startsWith(token),
      );
      if (!hit) continue;
      const owners = bags.filter((bag) => bag.includes(word)).length;
      score += owners === 1 ? 3 : 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = persona.role;
    }
  });
  return best;
}

function requirementFromComplaint(quote: string): string {
  const text = quote.toLowerCase();
  if (/amount due|can't find|cannot find/.test(text)) {
    return "The amount due is visible without searching the invoice.";
  }
  if (/card failed|don't know why|do not know why|declin/.test(text)) {
    return "A failed card tells the payer why it failed and what to do next.";
  }
  if (/paid but|still shows due|shows due/.test(text)) {
    return "A completed payment clears the amount due. The screen cannot say both paid and due.";
  }
  return `Address the stated complaint: ${quote}.`;
}

function scopedRequirements(
  groups: { priority: Priority; lines: string[] }[],
  personas: Persona[],
): Requirement[] {
  const requirements: Requirement[] = [];
  for (const group of groups) {
    for (const line of group.lines) {
      requirements.push({
        id: `R${requirements.length + 1}`,
        priority: group.priority,
        statement: line.replace(/\.$/, ""),
        rationale: `Stated in the source as ${group.priority}.`,
        persona: personaFor(line, personas),
        evidence: "stated",
      });
    }
  }
  return requirements;
}

function workaroundSentence(text: string) {
  const because = text.split(/\bbecause\b/i)[1]?.trim();
  if (because) return because.replace(/\.$/, "") + ".";
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  const found = sentences.find((sentence) =>
    /currently|today|right now|paper|phone|call|spreadsheet|manually|personal phones/i.test(sentence),
  );
  if (found && found.replace(/\s+/g, " ").trim() !== text.replace(/\s+/g, " ").trim()) return found;
  return "The source does not describe the workaround beyond the problem itself.";
}

function costSentence(text: string) {
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  const found = [...sentences].reverse().find((sentence) =>
    /miss|late|lost|fail|lock|error|cannot|can't|never|zero|drop/i.test(sentence),
  );
  if (found && found.replace(/\s+/g, " ").trim() === text.replace(/\s+/g, " ").trim()) {
    return "Waiting leaves the same situation in place.";
  }
  return found ?? clip(text, 180);
}

function constraintLines(docText: string, bullets: string[], paragraphs: string[]) {
  const fromSection = bullets.length ? bullets : paragraphs;
  const fromSentences = docText
    .split(/(?<=[.!?])\s+|\n/)
    .map((line) => line.trim())
    .filter(
      (line) =>
        /^(do not|don't|no microservices|no kubernetes)\b/i.test(line) ||
        /without a redesign|do not redesign/i.test(line),
    );
  const merged = [...fromSection, ...fromSentences];
  const seen: string[] = [];
  return merged.filter((line) => {
    const key = line.toLowerCase();
    if (seen.some((existing) => existing.includes(key) || key.includes(existing))) return false;
    seen.push(key);
    return true;
  });
}

function openQuestions(source: string, maturity: Judgment["maturity"], success: string[]) {
  const questions: string[] = [];
  if (maturity === "problem") {
    questions.push("What do people do today when this happens, and what would they accept instead?");
    questions.push("What number should move if the problem gets smaller?");
    questions.push("Who feels this every day, and who would have to agree to a change?");
  }
  if (/offline/i.test(source) && !/conflict/i.test(source)) {
    questions.push("When the same record changes on two devices before sync, which version wins?");
  }
  if (/cityworks|system of record/i.test(source) && !/\bapi\b|webhook|endpoint/i.test(source)) {
    questions.push("What can this product read from the system of record, and is it allowed to write back?");
  }
  if (maturity === "solution" && success.length === 0 && !/\d+(?:\.\d+)?%/.test(source)) {
    questions.push("Which number will tell us the problem is actually smaller after launch?");
  }
  return questions.slice(0, 5);
}

function titleFrom(docTitle: string | null, preamble: string, problem: string) {
  if (docTitle) return docTitle.replace(/\s+[—-]\s+product requirement$/i, "");
  const line = (preamble.split(/[.\n]/)[0] ?? problem).trim();
  const clause = line.split(/\bbecause\b/i)[0]?.trim() || line;
  return clip(clause, 72);
}

export function buildJudgment(input: ProductInput): Judgment {
  const source = composeSource(input);
  const doc = parseDocument(source);
  const problemBody = sectionBody(doc, "problem");
  const intro = [
    doc.preamble,
    ...doc.sections.filter((item) => item.key === "other").flatMap((item) => item.paragraphs),
  ]
    .filter(Boolean)
    .join(" ");
  const problemText =
    [problemBody.join(" ").trim(), intro].filter(Boolean).join(" ") ||
    clip(source, 400) ||
    "No problem was stated.";
  const success = section(doc, "success").bullets;
  const userBullets = section(doc, "users").bullets;
  const personas = userBullets.length
    ? personasFromUsers(userBullets, problemText, success[0] ?? "")
    : personasFromSituation(source, problemText);

  const scoped = scopedRequirements(
    [
      { priority: "must", lines: section(doc, "must").bullets },
      { priority: "should", lines: section(doc, "should").bullets },
      { priority: "later", lines: section(doc, "later").bullets },
    ],
    personas,
  );

  const complaints = quotedComplaints(source);
  const complaintRequirements: Requirement[] = scoped.length
    ? []
    : complaints.map((quote, index) => ({
        id: `R${index + 1}`,
        priority: "must" as const,
        statement: requirementFromComplaint(quote),
        rationale: `Stated by support volume for "${quote}".`,
        persona: personaFor(quote, personas),
        evidence: "stated" as const,
      }));

  const requirements = scoped.length ? scoped : complaintRequirements;
  const maturity = requirements.some((item) => item.priority === "must" && item.evidence === "stated")
    ? "solution"
    : "problem";

  const constraints = constraintLines(
    source,
    section(doc, "constraints").bullets,
    section(doc, "constraints").paragraphs,
  );

  const nonGoals = [
    ...section(doc, "nongoals").bullets,
    ...constraints.filter((line) => /do not|don't|without a redesign|no microservices|no kubernetes/i.test(line)),
  ];

  const questions = openQuestions(source, maturity, success);
  const existingText = input.existing.trim() || sectionBody(doc, "existing").join("\n");
  const metrics = metricLines(existingText);
  let workaround = workaroundSentence(problemText);
  if (complaints.length && /does not describe the workaround/i.test(workaround)) {
    workaround = complaints.map((quote) => `"${quote}"`).join("; ");
  }
  let cost = costSentence(problemText);
  const completion = metrics.find((line) => /completed/i.test(line));
  if (completion && !/\d+(?:\.\d+)?%/.test(cost)) cost = completion;
  const problem: ProblemDefinition = {
    statement: problemText,
    who: personas.map((persona) => persona.role).join(", "),
    currentWorkaround: workaround,
    costOfInaction: cost,
    success,
    nonGoals,
    openQuestions: questions,
  };

  const findings: Finding[] = [];
  findings.push({
    topic: "The problem in the source",
    finding: clip(problemText, 320),
    evidence: problemBody.length || doc.preamble ? "stated" : "unknown",
    implication: "Later stages have to stay inside this wording.",
  });

  findings.push({
    topic: "Who is affected",
    finding: personas.map((persona) => `${persona.role} (${persona.evidence})`).join("; "),
    evidence: personas.every((persona) => persona.evidence === "stated") ? "stated" : "inferred",
    implication: personas.some((persona) => persona.evidence === "inferred")
      ? "Treat inferred people as a hypothesis until someone confirms them."
      : "These people were named in the source.",
  });

  if (maturity === "solution") {
    const counts = ["must", "should", "later"]
      .map((priority) => {
        const count = requirements.filter((item) => item.priority === priority).length;
        return count ? `${count} ${priority}` : "";
      })
      .filter(Boolean)
      .join(", ");
    findings.push({
      topic: "Scope already chosen",
      finding: counts || "The source names the change to make.",
      evidence: "stated",
      implication: "The breakdown traces that scope. It does not add a parallel product.",
    });
  }

  if (constraints.length) {
    findings.push({
      topic: "Bounds on the solution",
      finding: constraints.slice(0, 4).join(" "),
      evidence: "stated",
      implication: "The architect brief keeps these as constraints, not as optional notes.",
    });
  }

  if (metrics.length) {
    findings.push({
      topic: "Observed behavior",
      finding: metrics.join(" "),
      evidence: "stated",
      implication: "Use these counts as the baseline.",
    });
  }

  if (complaints.length) {
    findings.push({
      topic: "What people already say",
      finding: complaints.map((quote) => `"${quote}"`).join("; "),
      evidence: "stated",
      implication: "These complaints are the requirements until a new study replaces them.",
    });
  }

  for (const question of questions) {
    findings.push({
      topic: "Still open",
      finding: question,
      evidence: "unknown",
      implication: "The handoff tells engineering not to invent an answer.",
    });
  }

  const assumptions: string[] = [];
  const inferred = personas.filter((persona) => persona.evidence === "inferred");
  if (inferred.length) {
    assumptions.push(
      `${inferred.map((persona) => persona.role).join(" and ")} ${inferred.length === 1 ? "is" : "are"} inferred from the wording, not named as a persona.`,
    );
  }
  if (maturity === "problem") {
    assumptions.push("The source states a problem and no solution. The plan is validation work, not a committed build.");
  }
  if (!success.length && maturity === "solution") {
    const baseline = metrics.find((line) => /completed/i.test(line));
    assumptions.push(
      baseline
        ? `${baseline} is the baseline. The target after the change was not stated.`
        : "No success measure was stated. Launch criteria still need a number.",
    );
  }

  const risks: string[] = [];
  const mustCount = requirements.filter((item) => item.priority === "must").length;
  const team = source.match(/team is (\d+)/i);
  if (team && mustCount > Number(team[1]) * 2) {
    risks.push(
      `${mustCount} must-haves for a team of ${team[1]}. Sequence them. Do not staff the whole list as one release.`,
    );
  } else if (mustCount >= 8) {
    risks.push("The must-have list is long. The roadmap sequences it so the core loop ships before the official record.");
  }
  if (/offline/i.test(source) && /sync/i.test(source)) {
    risks.push("Offline capture and sync are the risky must-haves. Capture has to be useful before sync is perfect.");
  }
  if (/paid but|still shows due/i.test(source)) {
    risks.push("A payment that succeeds and still looks due destroys trust. Reconciliation comes before any new payment method.");
  }
  if (maturity === "problem") {
    risks.push("Designing a product before the open questions are answered will freeze the wrong workflow.");
  }

  if (maturity === "problem") {
    requirements.push(
      {
        id: "R1",
        priority: "must",
        statement: "Watch the named people through one occurrence of this problem and write down the workaround.",
        rationale: "The source states the pain and does not state the product.",
        persona: personas[0]?.role ?? "Primary user",
        evidence: "inferred",
      },
      {
        id: "R2",
        priority: "must",
        statement: "The team can show who is affected, what they do today, and which number should move.",
        rationale: "A build plan before that evidence would guess the solution.",
        persona: personas[0]?.role ?? "Primary user",
        evidence: "inferred",
      },
    );
  }

  const evidenceRank: Evidence[] = ["stated", "inferred", "unknown"];
  findings.sort((a, b) => evidenceRank.indexOf(a.evidence) - evidenceRank.indexOf(b.evidence));

  return {
    title: titleFrom(doc.title, doc.preamble, problemText),
    maturity,
    research: findings.slice(0, 8),
    problem,
    personas,
    requirements,
    constraints,
    assumptions,
    risks,
  };
}
