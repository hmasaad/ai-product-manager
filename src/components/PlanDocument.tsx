"use client";

import { planMarkdown } from "@/lib/handoff";
import { prdMarkdown } from "@/lib/prd";
import { SCORE_NOTE } from "@/lib/prioritize";
import type { Decision, Evidence, Priority, ProductPlan, TaggedLine } from "@/lib/types";

const SECTIONS = [
  ["discovery", "Discovery"],
  ["prd", "PRD"],
  ["research", "Research"],
  ["problem", "Problem"],
  ["personas", "Personas"],
  ["requirements", "Requirements"],
  ["decompose", "Decompose"],
  ["features", "Features"],
  ["stories", "Stories"],
  ["priority", "Priority"],
  ["roadmap", "Roadmap"],
  ["handoff", "Handoff"],
] as const;

function Pill({
  children,
  tone,
}: {
  children: string;
  tone: "sage" | "copper" | "stamp" | "navy" | "ink";
}) {
  const tones = {
    sage: "bg-sage/10 text-sage",
    copper: "bg-copper/10 text-copper",
    stamp: "bg-stamp/10 text-stamp",
    navy: "bg-navy text-paper",
    ink: "bg-paper-2 text-ink-soft",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] uppercase tracking-[0.12em] ${tones[tone]}`}>
      {children}
    </span>
  );
}

function evidenceTone(evidence: Evidence): "sage" | "copper" | "stamp" {
  if (evidence === "stated") return "sage";
  if (evidence === "inferred") return "copper";
  return "stamp";
}

function priorityTone(priority: Priority): "navy" | "copper" | "ink" {
  if (priority === "must") return "navy";
  if (priority === "should") return "copper";
  return "ink";
}

function decisionTone(decision: Decision): "navy" | "copper" | "ink" {
  if (decision === "now") return "navy";
  if (decision === "next") return "copper";
  return "ink";
}

function download(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function copy(text: string) {
  await navigator.clipboard.writeText(text);
}

export function PlanDocument({ plan }: { plan: ProductPlan }) {
  const featureName = (id: string) => plan.features.find((feature) => feature.id === id)?.name ?? id;

  return (
    <div className="lg:grid lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-10">
      <nav className="no-print mb-8 flex gap-2 overflow-x-auto lg:sticky lg:top-6 lg:block lg:h-fit lg:space-y-1">
        {SECTIONS.map(([id, label]) => (
          <a
            key={id}
            href={`#${id}`}
            className="block whitespace-nowrap rounded-full px-3 py-1.5 text-sm text-ink-soft hover:bg-paper-2 hover:text-ink"
          >
            {label}
          </a>
        ))}
      </nav>

      <article className="print-sheet max-w-3xl">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-copper">
          {plan.maturity === "problem" ? "Problem brief — build is gated" : "Solution brief"}
          {" · "}
          {plan.mode === "model" ? "Model edit" : "Grounded in the source"}
        </p>
        <h1 className="mt-2 font-serif text-4xl tracking-tight text-navy">{plan.title}</h1>
        <p className="mt-3 text-sm text-ink-soft">
          {[
            [plan.requirements.length, "requirement"],
            [plan.features.length, "feature"],
            [plan.stories.length, "story"],
            [plan.milestones.length, "milestone"],
          ]
            .map(([count, word]) => `${count} ${word}${count === 1 ? "" : "s"}`)
            .join(" · ")}
        </p>
        {plan.note && (
          <p className="mt-4 rounded-2xl border border-copper/30 bg-copper/5 px-4 py-3 text-sm text-copper">
            {plan.note}
          </p>
        )}
        <div className="no-print mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-full bg-navy px-4 py-2 text-sm text-paper"
            onClick={() => download(`${plan.title.replace(/\s+/g, "-").toLowerCase()}.md`, planMarkdown(plan))}
          >
            Download plan
          </button>
          <button
            type="button"
            className="rounded-full border border-rule bg-white px-4 py-2 text-sm"
            onClick={() => void copy(plan.handoff.architect)}
          >
            Copy architect brief
          </button>
          <button
            type="button"
            className="rounded-full border border-rule bg-white px-4 py-2 text-sm"
            onClick={() => void copy(plan.handoff.developer)}
          >
            Copy developer brief
          </button>
          <button
            type="button"
            className="rounded-full border border-rule bg-white px-4 py-2 text-sm"
            onClick={() => void copy(prdMarkdown(plan))}
          >
            Copy PRD
          </button>
        </div>

        <section id="discovery" className="mt-12 scroll-mt-6">
          <h2 className="font-serif text-2xl text-navy">Product Discovery</h2>
          <p className="mt-2 text-sm text-ink-soft">
            {plan.proposed
              ? "Proposed from the request. Each line says whether it was stated, inferred, or still unknown."
              : "Read from the source. Unknown lines are questions, not filled-in facts."}
          </p>
          <h3 className="mt-6 font-medium">Problem Statement</h3>
          <p className="mt-2 text-sm leading-6">{plan.discovery.problemStatement}</p>
          <h3 className="mt-6 font-medium">Target Users</h3>
          <ul className="mt-2 space-y-2">
            {plan.discovery.targetUsers.map((user) => (
              <li key={user.role} className="text-sm leading-6">
                <span className="font-medium">{user.role}</span> <Pill tone={evidenceTone(user.evidence)}>{user.evidence}</Pill>
                <span className="mt-1 block text-ink-soft">{user.why}</span>
              </li>
            ))}
          </ul>
          <Tagged title="User problems" lines={plan.discovery.userProblems} />
          <h3 className="mt-6 font-medium">User Needs</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {plan.discovery.userNeeds.map((item) => (
              <li key={item.user + item.need}>
                {item.user}: {item.need}
              </li>
            ))}
          </ul>
          <Tagged title="Business Goals" lines={plan.discovery.businessGoals} />
          <Tagged title="Assumptions" lines={plan.discovery.assumptions} />
          <Tagged title="Constraints" lines={plan.discovery.constraints} />
          <h3 className="mt-6 font-medium">Competitors</h3>
          <ul className="mt-2 space-y-2">
            {plan.discovery.competitors.map((item) => (
              <li key={item.name} className="text-sm leading-6">
                <span className="font-medium">{item.name}</span> <Pill tone={evidenceTone(item.evidence)}>{item.evidence}</Pill>
                <span className="mt-1 block">{item.note}</span>
              </li>
            ))}
          </ul>
          <Tagged title="MVP Definition" lines={plan.discovery.mvpDefinition} />
          <Tagged title="Success Metrics" lines={plan.discovery.successMetrics} />
          {plan.discovery.questions.length > 0 && (
            <>
              <h3 className="mt-6 font-medium">Still asking</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                {plan.discovery.questions.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section id="prd" className="mt-12 scroll-mt-6">
          <h2 className="font-serif text-2xl text-navy">PRD</h2>
          <h3 className="mt-6 font-medium">Product Overview</h3>
          <p className="mt-2 text-sm leading-6">{plan.prd.overview}</p>
          <h3 className="mt-6 font-medium">Problem Statement</h3>
          <p className="mt-2 text-sm leading-6">{plan.prd.problemStatement}</p>
          <Bullet title="Goals" lines={plan.prd.goals} />
          <Bullet title="Non-goals" lines={plan.prd.nonGoals} />
          <h3 className="mt-6 font-medium">Personas</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {plan.prd.personas.map((persona) => (
              <li key={persona.role}>
                {persona.role}: {persona.why}
              </li>
            ))}
          </ul>
          <Bullet title="User Stories" lines={plan.prd.userStories.map((story) => `${story.id}. ${story.story}`)} />
          <h3 className="mt-6 font-medium">Functional Requirements</h3>
          <ul className="mt-2 space-y-2">
            {plan.prd.functionalRequirements.map((item) => (
              <li key={item.id} className="text-sm leading-6">
                <span className="font-mono text-xs text-ink-soft">{item.id}</span>{" "}
                <Pill tone={priorityTone(item.priority)}>{item.priority}</Pill> {item.statement}
                <span className="text-ink-soft"> — {item.persona}</span>
              </li>
            ))}
          </ul>
          <Tagged title="Non-functional Requirements" lines={plan.prd.nonFunctionalRequirements} />
          <h3 className="mt-6 font-medium">User Flows</h3>
          <div className="mt-2 space-y-3">
            {plan.prd.userFlows.map((flow) => (
              <div key={flow.name}>
                <p className="text-sm font-medium">{flow.name}</p>
                <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm">
                  {flow.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
          <h3 className="mt-6 font-medium">Acceptance Criteria</h3>
          <ul className="mt-2 space-y-2">
            {plan.prd.acceptanceCriteria.map((item) => (
              <li key={item.id} className="text-sm">
                <span className="font-mono text-xs text-ink-soft">{item.id}</span>
                <ul className="mt-1 list-disc pl-5">
                  {item.criteria.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
          <Tagged title="Edge Cases" lines={plan.prd.edgeCases} />
          <h3 className="mt-6 font-medium">Analytics Events</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {plan.prd.analyticsEvents.map((item) => (
              <li key={item.name}>
                <span className="font-mono text-xs">{item.name}</span> — {item.when}
              </li>
            ))}
          </ul>
          <Tagged title="Dependencies" lines={plan.prd.dependencies} />
          <Bullet title="Risks" lines={plan.prd.risks} />
          <Bullet title="Open Questions" lines={plan.prd.openQuestions} />
          <Bullet title="MVP Scope" lines={plan.prd.mvpScope} />
          <Bullet title="Future Scope" lines={plan.prd.futureScope} />
        </section>

        <section id="research" className="mt-12 scroll-mt-6">
          <h2 className="font-serif text-2xl text-navy">Product Research</h2>
          <ul className="mt-4 space-y-4">
            {plan.research.map((item) => (
              <li key={item.topic + item.finding} className="rounded-2xl border border-rule bg-white/70 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-medium">{item.topic}</h3>
                  <Pill tone={evidenceTone(item.evidence)}>{item.evidence}</Pill>
                </div>
                <p className="mt-2 text-sm leading-6">{item.finding}</p>
                <p className="mt-2 text-sm text-ink-soft">{item.implication}</p>
              </li>
            ))}
          </ul>
        </section>

        <section id="problem" className="mt-12 scroll-mt-6">
          <h2 className="font-serif text-2xl text-navy">Problem Definition</h2>
          <p className="mt-4 text-lg leading-8">{plan.problem.statement}</p>
          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            {[
              ["Who", plan.problem.who],
              ["Today", plan.problem.currentWorkaround],
              ["If we do nothing", plan.problem.costOfInaction],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-rule bg-white/70 p-4">
                <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">{label}</dt>
                <dd className="mt-2 text-sm leading-6">{value}</dd>
              </div>
            ))}
          </dl>
          <h3 className="mt-6 font-medium">Success</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {(plan.problem.success.length ? plan.problem.success : ["No success measure was stated."]).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          {plan.problem.openQuestions.length > 0 && (
            <>
              <h3 className="mt-6 font-medium">Open questions</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                {plan.problem.openQuestions.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section id="personas" className="mt-12 scroll-mt-6">
          <h2 className="font-serif text-2xl text-navy">User Personas</h2>
          <div className="mt-4 grid gap-4">
            {plan.personas.map((persona) => (
              <article key={persona.role} className="rounded-2xl border border-rule bg-white/70 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-serif text-xl text-navy">{persona.role}</h3>
                  <Pill tone={evidenceTone(persona.evidence)}>{persona.evidence}</Pill>
                </div>
                <p className="mt-2 text-sm leading-6">{persona.context}</p>
                <p className="mt-3 text-sm">
                  <span className="text-ink-soft">Jobs. </span>
                  {persona.jobs.join(" · ")}
                </p>
                <p className="mt-2 text-sm">
                  <span className="text-ink-soft">Success. </span>
                  {persona.success}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section id="requirements" className="mt-12 scroll-mt-6">
          <h2 className="font-serif text-2xl text-navy">Requirements trace</h2>
          <ul className="mt-4 space-y-3">
            {plan.requirements.map((item) => (
              <li key={item.id} className="rounded-2xl border border-rule bg-white/70 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-ink-soft">{item.id}</span>
                  <Pill tone={priorityTone(item.priority)}>{item.priority}</Pill>
                  <Pill tone={evidenceTone(item.evidence)}>{item.evidence}</Pill>
                  <span className="text-xs text-ink-soft">{item.persona}</span>
                </div>
                <p className="mt-2 text-sm leading-6">{item.statement}</p>
                <p className="mt-1 text-sm text-ink-soft">{item.rationale}</p>
              </li>
            ))}
          </ul>
          {plan.constraints.length > 0 && (
            <>
              <h3 className="mt-6 font-medium">Constraints</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                {plan.constraints.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </>
          )}
          {plan.problem.nonGoals.length > 0 && (
            <>
              <h3 className="mt-6 font-medium">Non-goals</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                {plan.problem.nonGoals.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section id="decompose" className="mt-12 scroll-mt-6">
          <h2 className="font-serif text-2xl text-navy">Feature Decomposition</h2>
          <pre className="mt-4 overflow-x-auto rounded-2xl border border-rule bg-white/80 p-4 font-mono text-sm leading-6">
            {plan.decomposition.ascii}
          </pre>
          <div className="mt-4 space-y-4">
            {plan.decomposition.nodes.map((node) => (
              <article key={node.featureId} className="rounded-2xl border border-rule bg-white/70 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-medium">{node.name}</h3>
                  <Pill tone={priorityTone(node.scope)}>{node.scope}</Pill>
                </div>
                <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">User story</p>
                <p className="mt-1 text-sm leading-6">{node.story}</p>
                <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">Acceptance criteria</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                  {node.acceptance.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
                <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">Engineering tasks</p>
                <ul className="mt-1 space-y-1 text-sm">
                  {node.tasks.map((task) => (
                    <li key={task.id}>
                      <span className="font-mono text-xs text-ink-soft">
                        {task.id} · {task.lane}
                      </span>{" "}
                      {task.title}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">Test cases</p>
                <ul className="mt-1 space-y-2 text-sm">
                  {node.tests.map((test) => (
                    <li key={test.id}>
                      <span className="font-mono text-xs text-ink-soft">{test.id}</span> {test.title}
                      <span className="mt-1 block text-ink-soft">Expected: {test.expected}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section id="features" className="mt-12 scroll-mt-6">
          <h2 className="font-serif text-2xl text-navy">Feature Breakdown</h2>
          <ul className="mt-4 space-y-3">
            {plan.features.map((feature) => (
              <li key={feature.id} className="rounded-2xl border border-rule bg-white/70 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-ink-soft">{feature.id}</span>
                  <h3 className="font-medium">{feature.name}</h3>
                  <Pill tone={priorityTone(feature.scope)}>{feature.scope}</Pill>
                </div>
                <p className="mt-2 text-sm leading-6">{feature.outcome}</p>
                {feature.requirementIds.length > 0 && (
                  <p className="mt-2 font-mono text-xs text-ink-soft">{feature.requirementIds.join(" · ")}</p>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section id="stories" className="mt-12 scroll-mt-6">
          <h2 className="font-serif text-2xl text-navy">User Stories / Tasks</h2>
          <div className="mt-4 space-y-4">
            {plan.stories.map((story) => (
              <article key={story.id} className="rounded-2xl border border-rule bg-white/70 p-4">
                <p className="font-mono text-xs text-ink-soft">
                  {story.id} · {story.featureId} · {featureName(story.featureId)}
                </p>
                <p className="mt-2 text-sm leading-6">{story.story}</p>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
                  {story.acceptance.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
                <ul className="mt-3 space-y-1 text-sm">
                  {story.tasks.map((task) => (
                    <li key={task.id}>
                      <span className="font-mono text-xs text-ink-soft">
                        {task.id} · {task.lane}
                      </span>{" "}
                      {task.title}
                    </li>
                  ))}
                </ul>
                <ul className="mt-3 space-y-1 text-sm">
                  {story.tests.map((test) => (
                    <li key={test.id}>
                      <span className="font-mono text-xs text-ink-soft">{test.id}</span> {test.title}
                      <span className="text-ink-soft"> — {test.expected}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section id="priority" className="mt-12 scroll-mt-6">
          <h2 className="font-serif text-2xl text-navy">Prioritization Engine</h2>
          <p className="mt-3 text-sm leading-6 text-ink-soft">{SCORE_NOTE}</p>
          <ol className="mt-4 space-y-4">
            {plan.priorities.map((item, index) => (
              <li key={item.featureId} className="rounded-2xl border border-rule bg-white/70 p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h3 className="font-medium">
                    <span className="mr-2 font-mono text-xs text-ink-soft">{index + 1}</span>
                    {featureName(item.featureId)}
                  </h3>
                  <div className="flex items-center gap-2">
                    <Pill tone={decisionTone(item.decision)}>{item.decision}</Pill>
                    <span className="font-serif text-2xl text-navy">{item.score}</span>
                  </div>
                </div>
                <p className="mt-2 font-mono text-sm text-ink-soft">{item.rationale}</p>
                <ul className="mt-4 divide-y divide-rule/70">
                  {item.factors.map((factor) => (
                    <li key={factor.key} className="grid gap-2 py-3 sm:grid-cols-[11rem_3.5rem_1fr] sm:items-start">
                      <p className="text-sm">{factor.label}</p>
                      <p className="font-mono text-sm">
                        {factor.sign === 1 ? "+" : "−"}
                        {factor.score}
                      </p>
                      <p className="text-sm leading-6 text-ink-soft">
                        <Pill tone={evidenceTone(factor.evidence)}>{factor.evidence}</Pill> {factor.reason}
                      </p>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </section>

        <section id="roadmap" className="mt-12 scroll-mt-6">
          <h2 className="font-serif text-2xl text-navy">Roadmap Generator</h2>
          <p className="mt-3 text-sm leading-6 text-ink-soft">{plan.roadmap.note}</p>
          <pre className="mt-4 overflow-x-auto rounded-2xl border border-rule bg-white/80 p-4 font-mono text-sm leading-6">
            {plan.roadmap.ascii}
          </pre>
          <ol className="mt-4 space-y-4">
            {plan.roadmap.sprints.map((sprint) => (
              <li key={sprint.id} className="rounded-2xl border border-rule bg-white/70 p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-serif text-xl text-navy">{sprint.name}</h3>
                  {sprint.window && <p className="font-mono text-xs text-ink-soft">{sprint.window}</p>}
                </div>
                <ul className="mt-3 space-y-3">
                  {sprint.placements.map((item) => (
                    <li key={item.featureId}>
                      <p className="font-medium">{featureName(item.featureId)}</p>
                      {item.dependsOn.length > 0 && (
                        <p className="mt-1 text-sm text-ink-soft">Depends on {item.dependsOn.join(", ")}.</p>
                      )}
                      <p className="mt-1 text-sm leading-6">{item.reason}</p>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
          {plan.roadmap.deferred.length > 0 && (
            <div className="mt-4 rounded-2xl border border-rule bg-white/70 p-4">
              <h3 className="font-serif text-xl text-navy">After week {plan.roadmap.weeks}</h3>
              <ul className="mt-3 space-y-3">
                {plan.roadmap.deferred.map((item) => (
                  <li key={item.featureId}>
                    <p className="font-medium">{featureName(item.featureId)}</p>
                    {item.dependsOn.length > 0 && (
                      <p className="mt-1 text-sm text-ink-soft">Depends on {item.dependsOn.join(", ")}.</p>
                    )}
                    <p className="mt-1 text-sm leading-6">{item.reason}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section id="handoff" className="mt-12 scroll-mt-6">
          <h2 className="font-serif text-2xl text-navy">Engineering Handoff</h2>
          <div className="mt-4 grid gap-4">
            <article className="rounded-2xl border border-rule bg-white/70 p-4">
              <h3 className="font-serif text-xl text-navy">AI Architect</h3>
              <p className="mt-1 text-sm text-ink-soft">Paste this brief into the architect. It is the PRD.</p>
              <pre className="mt-3 max-h-[28rem] overflow-auto whitespace-pre-wrap font-mono text-xs leading-5">
                {plan.handoff.architect}
              </pre>
            </article>
            <article className="rounded-2xl border border-rule bg-white/70 p-4">
              <h3 className="font-serif text-xl text-navy">AI Developer</h3>
              <p className="mt-1 text-sm text-ink-soft">Stories, acceptance, and tasks in milestone order.</p>
              <pre className="mt-3 max-h-[28rem] overflow-auto whitespace-pre-wrap font-mono text-xs leading-5">
                {plan.handoff.developer}
              </pre>
            </article>
          </div>
          {(plan.assumptions.length > 0 || plan.risks.length > 0) && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <h3 className="font-medium">Assumptions</h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                  {plan.assumptions.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-medium">Risks</h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                  {plan.risks.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </section>
      </article>
    </div>
  );
}

function Tagged({ title, lines }: { title: string; lines: TaggedLine[] }) {
  return (
    <>
      <h3 className="mt-6 font-medium">{title}</h3>
      <ul className="mt-2 space-y-2">
        {lines.map((item) => (
          <li key={item.text} className="text-sm leading-6">
            {item.text} <Pill tone={evidenceTone(item.evidence)}>{item.evidence}</Pill>
          </li>
        ))}
      </ul>
    </>
  );
}

function Bullet({ title, lines }: { title: string; lines: string[] }) {
  return (
    <>
      <h3 className="mt-6 font-medium">{title}</h3>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
        {(lines.length ? lines : ["None stated."]).map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </>
  );
}
