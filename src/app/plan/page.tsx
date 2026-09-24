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
        {plan && (!plan.discovery || !plan.decomposition || !plan.roadmap || !plan.recommendations || !plan.opportunityScoring || !plan.conflicts || !plan.ambiguities || !plan.decisions || !plan.traceability || !plan.impacts || !plan.riskAnalysis || !plan.experiments || !plan.analytics || !plan.approvals || !plan.orchestration || !plan.orchestration.connectedAscii || !(plan.orchestration.hops?.length === 11) || !plan.decisionEngine || !plan.decisionLedger || !plan.decisionLedger.versionAscii || !plan.decisionLedger.versioning?.ascii || !plan.decisionLedger.entries.every((item) => (item.version ?? 0) >= 1) || !plan.decisionReevaluation || !plan.decisionReevaluation.question || plan.decisionReevaluation.owner !== "human" || !(plan.decisionReevaluation.stages?.length === 9) || !(plan.decisionReevaluation.states?.length === 6) || !plan.decisionReevaluation.scoreAscii || !plan.decisionReevaluation.whatChangedAscii || !plan.productGraph || !plan.productGraph.lineageAscii || !plan.approach?.headline || !plan.portfolio || !(plan.portfolio.options?.length >= 2) || !plan.monitoring || !plan.productLoop || !plan.productLoop.mode || !plan.productLoop.cycleAscii || !(plan.productLoop.cycle?.length === 8) || !plan.productLoop.phase3Ascii || !(plan.productLoop.phase3?.length === 7) || !plan.priorities.every((item) => item.factors?.length === 7)) && (
          <div>
            <h1 className="font-serif text-4xl text-navy">This plan is from an older run</h1>
            <p className="mt-3 text-ink-soft">Build it again to include the client approach, discovery, ambiguities, tracked decisions, the PRD, scored priorities, recommendations, opportunity scores, conflicts, traceability, change impact, risk analysis, experiments, analytics, approval gates, specialized agents, the connected agent path, the decision engine, the decision ledger, decision versioning, re-evaluation, the re-evaluation score, the knowledge graph, decision lineage, portfolio intelligence, product monitoring, the autonomous product loop, the Phase 3 loop, the re-evaluation cycle, and the roadmap.</p>
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
          plan.orchestration.connectedAscii &&
          plan.orchestration.hops?.length === 11 &&
          plan.decisionEngine &&
          plan.decisionLedger &&
          plan.decisionLedger.versionAscii &&
          plan.decisionLedger.versioning?.ascii &&
          plan.decisionLedger.entries.every((item) => (item.version ?? 0) >= 1) &&
          plan.decisionReevaluation &&
          plan.decisionReevaluation.question &&
          plan.decisionReevaluation.owner === "human" &&
          plan.decisionReevaluation.stages?.length === 9 &&
          plan.decisionReevaluation.states?.length === 6 &&
          plan.decisionReevaluation.scoreAscii &&
          plan.decisionReevaluation.whatChangedAscii &&
          plan.productGraph &&
          plan.productGraph.lineageAscii &&
          plan.approach?.headline &&
          plan.portfolio &&
          plan.portfolio.options?.length >= 2 &&
          plan.monitoring &&
          plan.productLoop &&
          plan.productLoop.mode &&
          plan.productLoop.cycleAscii &&
          plan.productLoop.cycle?.length === 8 &&
          plan.productLoop.phase3Ascii &&
          plan.productLoop.phase3?.length === 7 &&
          plan.priorities.every((item) => item.factors?.length === 7) && <PlanDocument plan={plan} />}
      </main>
    </div>
  );
}
