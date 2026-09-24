# AI Product Manager

A product manager that turns an idea or a business problem into an engineering-ready plan.

```
                 AI PRODUCT MANAGER
                         │
             ┌───────────┴───────────┐
             ↓                       ↓
        Product Input           Existing Product
     idea / problem / request    docs / analytics
             │                       │
             └───────────┬───────────┘
                         ↓
                  Product Research
                         ↓
                 Problem Definition
                         ↓
                  User Personas
                         ↓
                Requirements / PRD
                         ↓
                  Feature Breakdown
                         ↓
                User Stories / Tasks
                         ↓
              Prioritization Engine
                         ↓
                Roadmap / Milestones
                         ↓
              Engineering Handoff
                         ↓
              ┌──────────┴──────────┐
              ↓                     ↓
        AI Architect            AI Developer
```

Product Discovery writes the problem, target users, user needs, business goals, assumptions, constraints, competitors, success metrics, and an MVP definition. The PRD generator turns that into an overview, goals, non-goals, personas, stories, functional and non-functional requirements, flows, acceptance criteria, edge cases, analytics events, dependencies, risks, open questions, MVP scope, and future scope. Feature Decomposition turns a capability such as “Build farmer field management” into a tree, then a user story, acceptance criteria, engineering tasks, and test cases for each branch.

A sentence like “build an app for farmers to track field activities” becomes a proposed MVP. Inferred competitors are a landscape to check, not a market study. A one-line problem with no product still stays a validation plan. A PRD or a set of support complaints keeps the scope that was stated.

The architect brief is a PRD. The developer brief is stories, acceptance, and tasks in milestone order.

Priority is an explicit score, and every factor is shown with its reason:

```
Priority score = business value + user impact + strategic alignment + revenue impact + urgency − engineering effort − risk
```

Each factor is 1 to 5. When the source never mentions revenue, that factor is 1 and marked unknown.

The roadmap generator places features from dependencies and capacity. “20 proposed features, 3 developers, 8-week target” becomes 2-week sprints: a feature waits until its dependencies are already placed, and a sprint holds only as many developer-weeks as the team has.

Product context remembers each finished plan, plus feedback and metrics you add on the Context page. The next request is checked against existing features, previous decisions, goals, personas, constraints, previous PRDs, technical limitations, experiments, and the roadmap. A repeat of recorded work, or a request that crosses a recorded decision, stays out of the new scope.

A recommendation is not a bare “build this.” It names the opportunity, the evidence, user impact, business impact, technical cost, risks, a confidence score, and the unknowns. Confidence is a formula. Support volume, an encounter rate, and feature-request counts raise it. Missing revenue or a problem with no counts lower it.

Every feature has a risk register: product, technical, security, UX, business, compliance, and operational. Each names the failure, the cause, the mitigation, and the residual uncertainty. A bare High is not a risk.

A large feature starts as a hypothesis. Experiment planning writes the idea, the prototype, the primary metric, and the success threshold, then leaves the decision as Build, Modify, or Abandon until the test runs. Stated numbers such as ten users or a 30% reduction stay stated. A thin problem stays a validation experiment.

Product analytics feeds the PM after launch. Events, errors, and user behavior are read from the existing product (and from metrics you remember). A launched feature whose usage is declining is investigated. A problem is named only from those signals. That becomes a product opportunity and a proposed improvement. A greenfield brief with no live telemetry stays empty.

The PM does not commit on its own. Human approval gates sit after a proposal: evidence, risk, a person signs, then the decision commits. Gates cover product strategy, scope changes, priority changes, major roadmap decisions, and production-impacting changes. Authorization is risk-based. Priority waits for review. Strategy, scope, roadmap, and production are mandatory human. Nothing in those lanes runs automatically.

The product manager is an orchestrator. Six specialists run the work: Product Research, Requirements, Analytics, Market, Risk, and Experiment. Their outputs meet at a Product Decision. Market is a competitor landscape from the source, not a TAM study.

The Product Decision Engine collects user evidence, business context, and technical context, then writes options, trade-offs, and risks. A person chooses. The choice becomes a decision record. The engine answers what the options are, what evidence supports each one, what is being traded off, and what is still missing. It does not stop at “Build X.”

Significant choices land on a Decision Ledger as structured objects (`DEC-142`). Facts, assumptions, and decisions stay on separate layers: an observation (measured fact), an assumption (interpretation), a decision (the choice), and a labeled confidence. Re-evaluation runs only when an explicit trigger fires: metric, feedback, business, technical, time, or dependency. New evidence challenges the assumption. The recorded decision stays until a person reviews it. Later the PM can ask why an architecture was chosen, or which assumptions behind that decision no longer hold. Those records stay in product memory.

A recorded decision is re-evaluated when a trigger fires. The pipeline retrieves the original decision, supporting evidence, and assumptions, collects new evidence, compares old vs new state, names the changed assumption, calculates impact, and writes a proposal card: original decision, trigger, changed assumption, impact, proposed action, and confidence. The engine leaves the recorded choice in place. A person still owns Keep Decision, Review, or Change Decision. The decision moves through states: ACTIVE, TRIGGERED, UNDER_REVIEW, then VALIDATED, DECISION_CHANGED, or DECISION_RETAINED. A change writes a new version of the same decision, such as DEC-142 v2 after DEC-142 v1. The old version stays. Together the versions are the product decision history. Stated later evidence such as a 38% rise in offline usage stays stated. A greenfield brief with no new evidence stays quiet.

The Product Knowledge Graph connects customer, problem, opportunity, feature, and requirement, then the decision, risk, experiment, and metric that hang off that requirement, and the outcome they aim for. The PM can ask which features sit on the biggest customer problems, which roadmap items have weak evidence, which requirements hang on unvalidated assumptions, and which decisions new customer feedback moves.

Opportunity scoring evaluates each named opportunity on eight factors: customer impact, business impact, strategic alignment, reach, confidence, engineering effort, risk, and evidence quality. Each factor is 1 to 5 with a reason and an evidence tag. The stored equation is the score. A bare 8.7/10 is not a score. Reach stays unknown when the source never counted users.

Portfolio Intelligence reads every remembered product plus the current plan. The tree is the portfolio, then each product and its features, then a portfolio view. That view names duplicated initiatives, conflicting roadmaps, shared dependencies, resource constraints, strategic gaps, weak evidence, and risky assumptions. Then it names the bets, the evidence for each, the trade-offs, and what is still missing. A person records the call. A single product stays a single column. Totals stay unnamed unless stated.

Autonomous product monitoring reads metrics, feedback, and experiments. A stated anomaly becomes a product signal: the feature, the change, potential causes, evidence confidence, and a recommended investigation. A 17% conversion drop on Report Export stays 17%, with the three named causes and a pre/post-release funnel check. The monitor investigates before it decides. A person still signs.

The Autonomous Product Loop is the operating cycle: observe, understand, discover, analyze, propose, validate, decide, plan, execute, measure, learn, then observe again. Observe through propose can run from evidence. Validate, decide, and execute wait on a person. A live signal stays on analyze until the investigation is signed complete. A problem brief stays on validate. Mandatory gates hold decide. After measure and learn, the loop observes again. The PM is an operating system, not a document printer.

A requirement change has a blast radius: features, APIs, database, screens, permissions, tests, documentation, and security. That list is written into the architect brief and the developer brief.

A feature is a chain from a business goal to a test case. A backend task is the API. Asking why that API exists walks back through the feature, the user story, the customer problem, and the business goal.

Every generated decision carries a status: confirmed, assumption, inferred, unknown, or needs validation. A guessed default such as “Most users will export reports as PDF” stays an assumption, with a validation step, and does not become a requirement.

Ambiguity detection runs before the PRD. A line such as “Users should be able to export reports” is opened into who, which reports, format, size, async work, permissions, and audit. Critical questions must be clarified. Important questions are recommendations. Minor questions become a labeled assumption. The PRD keeps those questions instead of inventing an answer.

The conflict detector compares a new requirement to existing requirements and the architecture. An opposite claim — edit versus immutable, replace versus remains — becomes a conflict card with the impact and a suggested resolution. A repeated feature is context, not a conflict.

## Run

```bash
npm install
npm run dev
```

Open [http://localhost:3010](http://localhost:3010). Load HarborLine, the clinic phone rush, or the billing analytics. No key is required.

```bash
npm run check
```

The check plans those three briefs and fails if stated scope disappears or a thin idea grows a stack.

## Model

Copy `.env.example` to `.env.local` and set `GEMINI_API_KEY` (or `OPENAI_API_KEY`). The model may edit the grounded draft. If it drops a stated must-have, or turns a problem into a build, the grounded plan is kept.
