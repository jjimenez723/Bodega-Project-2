"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { formatCurrency } from "@/lib/calculations";
import {
  subscribeToBatches,
  updateHarvestMetrics,
} from "@/lib/firebase/firestore";
import type { AppUser, HarvestBatch, HarvestMetrics } from "@/types/firestore";

export function PartnerMetricsForm({ profile }: { profile: AppUser }) {
  const [batches, setBatches] = useState<HarvestBatch[]>([]);
  const [batchId, setBatchId] = useState("");
  const [totalWeightLb, setTotalWeightLb] = useState("0");
  const [missedWeightLb, setMissedWeightLb] = useState("0");
  const [compostableWeightLb, setCompostableWeightLb] = useState("0");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
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
          setError("Your assigned harvest batches could not be loaded.");
          setLoading(false);
        },
      ),
    [profile.id, profile.role],
  );

  const selectedBatch = useMemo(
    () => batches.find((batch) => batch.id === batchId) ?? null,
    [batchId, batches],
  );

  function selectBatch(nextId: string) {
    setBatchId(nextId);
    const batch = batches.find((candidate) => candidate.id === nextId);
    setTotalWeightLb(String(batch?.metrics.totalWeightLb ?? 0));
    setMissedWeightLb(String(batch?.metrics.missedWeightLb ?? 0));
    setCompostableWeightLb(String(batch?.metrics.compostableWeightLb ?? 0));
    setMessage("");
    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedBatch) return;

    const metrics: HarvestMetrics = {
      totalWeightLb: nonNegative(totalWeightLb),
      missedWeightLb: nonNegative(missedWeightLb),
      compostableWeightLb: nonNegative(compostableWeightLb),
    };

    setMessage("");
    setError("");
    if (metrics.missedWeightLb > metrics.totalWeightLb) {
      setError("Missed weight cannot exceed total weight.");
      return;
    }
    if (metrics.compostableWeightLb > metrics.missedWeightLb) {
      setError("Compostable weight must be part of the missed weight.");
      return;
    }

    setSaving(true);
    try {
      await updateHarvestMetrics(selectedBatch, metrics, profile.id);
      setMessage("Harvest metrics saved. Profitability has been recalculated.");
    } catch {
      setError("Metrics were not saved. Confirm this batch is assigned to you.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="partner-layout">
      <form className="content-card partner-form" onSubmit={handleSubmit}>
        <div className="section-heading">
          <div>
            <p className="eyebrow">Partner entry</p>
            <h2>Harvest weight report</h2>
            <p className="muted">
              Your access is limited to harvest metrics on batches assigned to you.
            </p>
          </div>
          <span className="status-pill status-pill--secure">Metrics only</span>
        </div>

        {loading ? <p className="muted">Loading assigned batches…</p> : null}
        {!loading && batches.length === 0 ? (
          <div className="empty-state">
            <strong>No batches assigned yet</strong>
            <p>Ask your project manager to create and assign a batch first.</p>
          </div>
        ) : null}
        {batches.length > 0 ? (
          <>
            <label className="field">
              <span>Assigned batch</span>
              <select value={batchId} onChange={(event) => selectBatch(event.target.value)} required>
                <option value="">Choose a site and crop…</option>
                {batches.map((batch) => (
                  <option value={batch.id} key={batch.id}>
                    {batch.siteName} · {batch.cropName} · {batch.harvestDate.toDate().toLocaleDateString()}
                  </option>
                ))}
              </select>
            </label>

            {selectedBatch ? (
              <div className="selected-batch">
                <div><span>Method</span><strong>{selectedBatch.method === "soil" ? "Soil" : "Hydroponics"}</strong></div>
                <div><span>Period</span><strong>{selectedBatch.reportingPeriod}</strong></div>
                <div><span>Price / lb</span><strong>{formatCurrency(selectedBatch.rates.pricePerLb)}</strong></div>
              </div>
            ) : null}

            <fieldset disabled={!selectedBatch}>
              <legend>Weight measurements</legend>
              <div className="form-grid form-grid--three">
                <MetricInput label="Total weight" hint="Everything harvested" value={totalWeightLb} onChange={setTotalWeightLb} />
                <MetricInput label="Weight missed" hint="Unsellable or spoiled" value={missedWeightLb} onChange={setMissedWeightLb} />
                <MetricInput label="Weight compostable" hint="Recoverable from missed" value={compostableWeightLb} onChange={setCompostableWeightLb} />
              </div>
            </fieldset>

            {message ? <p className="form-message form-message--success">{message}</p> : null}
            {error ? <p className="form-message form-message--error">{error}</p> : null}
            <div className="form-actions">
              <button className="button button--primary" disabled={!selectedBatch || saving}>
                {saving ? "Saving metrics…" : "Submit harvest metrics"}
              </button>
            </div>
          </>
        ) : null}
      </form>

      <aside className="content-card partner-help">
        <span className="help-icon" aria-hidden="true">✓</span>
        <h2>What happens next?</h2>
        <p>
          Revenue, costs, sellable yield, and profit update automatically using
          the rates set by your project manager.
        </p>
        <ul>
          <li>Use the same unit—pounds—for all three fields.</li>
          <li>Missed weight includes spoiled or unsellable produce.</li>
          <li>Compostable weight is the reusable part of missed weight.</li>
        </ul>
      </aside>
    </section>
  );
}

function MetricInput({ label, hint, value, onChange }: { label: string; hint: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="metric-input">
      <span>{label}</span>
      <small>{hint}</small>
      <span className="input-affix"><input type="number" min="0" step="0.1" value={value} onChange={(event) => onChange(event.target.value)} required /><span>lb</span></span>
    </label>
  );
}

function nonNegative(value: string) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}
