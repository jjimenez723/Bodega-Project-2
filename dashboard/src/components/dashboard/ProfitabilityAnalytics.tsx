"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { formatCurrency, formatNumber } from "@/lib/calculations";
import { subscribeToBatches } from "@/lib/firebase/firestore";
import type { AppUser, GrowingMethod, HarvestBatch } from "@/types/firestore";

type Range = "all" | "30" | "90";

const pageLoadTime = Date.now();

type Totals = {
  batches: number;
  totalYield: number;
  sellableYield: number;
  missedWeight: number;
  compostableWeight: number;
  revenue: number;
  costs: number;
  profit: number;
};

const emptyTotals: Totals = {
  batches: 0,
  totalYield: 0,
  sellableYield: 0,
  missedWeight: 0,
  compostableWeight: 0,
  revenue: 0,
  costs: 0,
  profit: 0,
};

export function ProfitabilityAnalytics({ profile }: { profile: AppUser }) {
  const [batches, setBatches] = useState<HarvestBatch[]>([]);
  const [range, setRange] = useState<Range>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(
    () =>
      subscribeToBatches(
        profile.role,
        profile.id,
        (nextBatches) => {
          setBatches(nextBatches);
          setLoading(false);
        },
        () => {
          setError("Profitability data could not be loaded.");
          setLoading(false);
        },
      ),
    [profile.id, profile.role],
  );

  const filteredBatches = useMemo(() => {
    if (range === "all") return batches;
    const cutoff = pageLoadTime - Number(range) * 24 * 60 * 60 * 1000;
    return batches.filter((batch) => batch.harvestDate.toMillis() >= cutoff);
  }, [batches, range]);

  const totals = useMemo(() => aggregate(filteredBatches), [filteredBatches]);
  const soil = useMemo(
    () => aggregate(filteredBatches.filter((batch) => batch.method === "soil")),
    [filteredBatches],
  );
  const hydroponic = useMemo(
    () => aggregate(filteredBatches.filter((batch) => batch.method === "hydroponic")),
    [filteredBatches],
  );

  const maxRevenue = Math.max(soil.revenue, hydroponic.revenue, 1);
  const totalMargin = totals.revenue ? (totals.profit / totals.revenue) * 100 : 0;
  const totalWasteRate = totals.totalYield
    ? (totals.missedWeight / totals.totalYield) * 100
    : 0;

  return (
    <section className="analytics-stack">
      <div className="analytics-toolbar">
        <p className="muted">
          {profile.role === "partner"
            ? "Showing batches assigned to you"
            : "Live data across all project sites"}
        </p>
        <label className="range-select">
          <span>Period</span>
          <select value={range} onChange={(event) => setRange(event.target.value as Range)}>
            <option value="all">All time</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </label>
      </div>

      {loading ? <div className="content-card"><p className="muted">Loading live analytics…</p></div> : null}
      {error ? <p className="form-message form-message--error">{error}</p> : null}
      {!loading ? (
        <>
          <div className="summary-grid">
            <SummaryCard label="Net profit" value={formatCurrency(totals.profit)} detail={`${formatSigned(totalMargin)} margin`} tone={totals.profit < 0 ? "red" : "green"} />
            <SummaryCard label="Sellable yield" value={`${formatNumber(totals.sellableYield)} lb`} detail={`${formatNumber(totals.totalYield)} lb harvested`} tone="gold" />
            <SummaryCard label="Revenue" value={formatCurrency(totals.revenue)} detail={`Across ${totals.batches} batch${totals.batches === 1 ? "" : "es"}`} tone="blue" />
            <SummaryCard label="Missed weight" value={`${formatNumber(totals.missedWeight)} lb`} detail={`${formatNumber(totalWasteRate)}% of total yield`} tone="clay" />
          </div>

          <div className="comparison-grid">
            <article className="content-card comparison-card">
              <div className="section-heading section-heading--compact">
                <div><p className="eyebrow">Method comparison</p><h2>Profitability by growing system</h2></div>
                <span className="status-pill">{filteredBatches.length} batches</span>
              </div>
              {filteredBatches.length ? (
                <div className="method-comparison">
                  <MethodRow method="soil" totals={soil} maxRevenue={maxRevenue} />
                  <MethodRow method="hydroponic" totals={hydroponic} maxRevenue={maxRevenue} />
                </div>
              ) : (
                <div className="empty-state"><strong>No harvest data in this period</strong><p>Create a batch or choose a wider date range.</p></div>
              )}
            </article>

            <article className="content-card recovery-card">
              <p className="eyebrow">Material recovery</p>
              <h2>Where missed weight goes</h2>
              <div className="recovery-figure">
                <strong>{formatNumber(totals.compostableWeight)} lb</strong>
                <span>compostable</span>
              </div>
              <div className="progress-track"><span style={{ width: `${totals.missedWeight ? Math.min(100, (totals.compostableWeight / totals.missedWeight) * 100) : 0}%` }} /></div>
              <p className="muted">{totals.missedWeight ? formatNumber((totals.compostableWeight / totals.missedWeight) * 100) : "0"}% of missed produce can return to the growing cycle.</p>
            </article>
          </div>

          <article className="content-card recent-card">
            <div className="section-heading section-heading--compact">
              <div><p className="eyebrow">Batch ledger</p><h2>Recent harvests</h2></div>
            </div>
            <div className="table-scroll">
              <table>
                <thead><tr><th>Date</th><th>Site &amp; crop</th><th>Method</th><th>Sellable</th><th>Revenue</th><th>Profit</th></tr></thead>
                <tbody>
                  {filteredBatches.slice(0, 8).map((batch) => (
                    <tr key={batch.id}>
                      <td>{batch.harvestDate.toDate().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
                      <td><strong>{batch.cropName}</strong><small>{batch.siteName}</small></td>
                      <td><span className={`method-pill method-pill--${batch.method}`}>{batch.method === "soil" ? "Soil" : "Hydro"}</span></td>
                      <td>{formatNumber(batch.financials.sellableYieldLb)} lb</td>
                      <td>{formatCurrency(batch.financials.revenue)}</td>
                      <td className={batch.financials.profit < 0 ? "negative-text" : "positive-text"}>{formatCurrency(batch.financials.profit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!filteredBatches.length ? <div className="table-empty">No batches to display.</div> : null}
            </div>
          </article>
        </>
      ) : null}
    </section>
  );
}

function aggregate(batches: HarvestBatch[]): Totals {
  return batches.reduce<Totals>((totals, batch) => ({
    batches: totals.batches + 1,
    totalYield: totals.totalYield + batch.metrics.totalWeightLb,
    sellableYield: totals.sellableYield + batch.financials.sellableYieldLb,
    missedWeight: totals.missedWeight + batch.metrics.missedWeightLb,
    compostableWeight: totals.compostableWeight + batch.metrics.compostableWeightLb,
    revenue: totals.revenue + batch.financials.revenue,
    costs: totals.costs + batch.financials.totalCosts,
    profit: totals.profit + batch.financials.profit,
  }), { ...emptyTotals });
}

function SummaryCard({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: "green" | "red" | "gold" | "blue" | "clay" }) {
  return <article className={`summary-card summary-card--${tone}`}><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>;
}

function MethodRow({ method, totals, maxRevenue }: { method: GrowingMethod; totals: Totals; maxRevenue: number }) {
  const costPerPound = totals.sellableYield ? totals.costs / totals.sellableYield : 0;
  const wasteRate = totals.totalYield ? (totals.missedWeight / totals.totalYield) * 100 : 0;
  const width = Math.max(totals.revenue ? 8 : 0, (totals.revenue / maxRevenue) * 100);
  return (
    <div className="method-row">
      <div className="method-row__heading"><span className={`method-dot method-dot--${method}`} /><div><strong>{method === "soil" ? "Soil" : "Hydroponics"}</strong><small>{totals.batches} batch{totals.batches === 1 ? "" : "es"}</small></div><b>{formatCurrency(totals.profit)} profit</b></div>
      <div className="revenue-bar"><span style={{ "--bar-width": `${width}%` } as CSSProperties} /></div>
      <div className="method-row__stats"><span><small>Revenue</small>{formatCurrency(totals.revenue)}</span><span><small>Cost / sellable lb</small>{formatCurrency(costPerPound)}</span><span><small>Missed rate</small>{formatNumber(wasteRate)}%</span></div>
    </div>
  );
}

function formatSigned(value: number) {
  return `${value >= 0 ? "+" : ""}${formatNumber(value)}%`;
}
