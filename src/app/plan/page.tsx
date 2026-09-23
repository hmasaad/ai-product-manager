"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { PlanDocument } from "@/components/PlanDocument";
import { fetchLatest } from "@/lib/storage";
import type { ProductPlan } from "@/lib/types";

export default function PlanPage() {
  const [plan, setPlan] = useState<ProductPlan | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void fetchLatest().then((latest) => {
      setPlan(latest);
      setReady(true);
    });
  }, []);

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-6 py-10">
        {!ready && <p className="text-sm text-ink-soft">Opening the latest plan…</p>}
        {ready && !plan && (
          <div>
            <h1 className="font-serif text-4xl text-navy">No plan yet</h1>
            <p className="mt-3 text-ink-soft">Start from an idea, a PRD, or notes on the product you already have.</p>
            <Link href="/" className="mt-6 inline-block rounded-full bg-navy px-5 py-2.5 text-sm text-paper">
              New plan
            </Link>
          </div>
        )}
        {plan && (!plan.discovery || !plan.decomposition || !plan.roadmap || !plan.recommendations || !plan.opportunityScoring || !plan.conflicts || !plan.ambiguities || !plan.decisions || !plan.traceability || !plan.impacts || !plan.riskAnalysis || !plan.experiments || !plan.analytics || !plan.approvals || !plan.orchestration || !plan.decisionEngine || !plan.decisionLedger || !plan.decisionReevaluation || !plan.productGraph || !plan.portfolio || !(plan.portfolio.options?.length >= 2) || !plan.monitoring || !plan.productLoop || !plan.productLoop.mode || !plan.priorities.every((item) => item.factors?.length === 7)) && (
          <div>
            <h1 className="font-serif text-4xl text-navy">This plan is from an older run</h1>
            <p className="mt-3 text-ink-soft">Build it again to include discovery, ambiguities, tracked decisions, the PRD, scored priorities, recommendations, opportunity scores, conflicts, traceability, change impact, risk analysis, experiments, analytics, approval gates, specialized agents, the decision engine, the decision ledger, re-evaluation, the knowledge graph, portfolio intelligence, product monitoring, the autonomous product loop, and the roadmap.</p>
            <Link href="/" className="mt-6 inline-block rounded-full bg-navy px-5 py-2.5 text-sm text-paper">
              New plan
            </Link>
          </div>
        )}
        {plan?.discovery &&
          plan.prd &&
          plan.decomposition &&
          plan.roadmap &&
          plan.recommendations &&
          plan.opportunityScoring &&
          plan.conflicts &&
          plan.ambiguities &&
          plan.decisions &&
          plan.traceability &&
          plan.impacts &&
          plan.riskAnalysis &&
          plan.experiments &&
          plan.analytics &&
          plan.approvals &&
          plan.orchestration &&
          plan.decisionEngine &&
          plan.decisionLedger &&
          plan.decisionReevaluation &&
          plan.productGraph &&
          plan.portfolio &&
          plan.portfolio.options?.length >= 2 &&
          plan.monitoring &&
          plan.productLoop &&
          plan.productLoop.mode &&
          plan.priorities.every((item) => item.factors?.length === 7) && <PlanDocument plan={plan} />}
      </main>
    </div>
  );
}
