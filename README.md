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
