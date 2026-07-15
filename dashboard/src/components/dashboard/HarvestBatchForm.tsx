"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { calculateBatchFinancials, formatCurrency } from "@/lib/calculations";
import { DEFAULT_SETTINGS } from "@/lib/defaults";
import {
  createHarvestBatch,
  dateStringToTimestamp,
  subscribeToPartners,
  subscribeToSettings,
} from "@/lib/firebase/firestore";
import type {
  AppUser,
  BatchInputs,
  BatchRates,
  GlobalSettings,
  GrowingMethod,
  HarvestMetrics,
  ReportingPeriod,
} from "@/types/firestore";

type FormState = {
  siteName: string;
  cropName: string;
  harvestDate: string;
  reportingPeriod: ReportingPeriod;
  assignedPartnerId: string;
  seedCost: string;
  waterGallons: string;
  laborHours: string;
  materialsCost: string;
  transportGasGallons: string;
  electricityKwh: string;
  pricePerLb: string;
  waterRatePerGallon: string;
  laborRatePerHour: string;
  electricityRatePerKwh: string;
  gasRatePerGallon: string;
  fossilFuelExternalityPerGallon: string;
  totalWeightLb: string;
  missedWeightLb: string;
  compostableWeightLb: string;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function initialForm(settings: GlobalSettings): FormState {
  return {
    siteName: "",
    cropName: "",
    harvestDate: today(),
    reportingPeriod: "weekly",
    assignedPartnerId: "",
    seedCost: String(settings.defaultSeedCost),
    waterGallons: "0",
    laborHours: "0",
    materialsCost: String(settings.defaultMaterialsCost),
    transportGasGallons: "0",
    electricityKwh: "0",
    pricePerLb: String(settings.defaultPricePerLb),
    waterRatePerGallon: String(settings.waterRatePerGallon),
    laborRatePerHour: String(settings.laborRatePerHour),
    electricityRatePerKwh: String(settings.electricityRatePerKwh),
    gasRatePerGallon: String(settings.gasRatePerGallon),
    fossilFuelExternalityPerGallon: String(
      settings.fossilFuelExternalityPerGallon,
    ),
    totalWeightLb: "0",
    missedWeightLb: "0",
    compostableWeightLb: "0",
  };
}

export function HarvestBatchForm({ userId }: { userId: string }) {
  const [method, setMethod] = useState<GrowingMethod>("soil");
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [form, setForm] = useState<FormState>(() => initialForm(DEFAULT_SETTINGS));
  const [partners, setPartners] = useState<AppUser[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const stopSettings = subscribeToSettings((nextSettings) => {
      setSettings(nextSettings);
      setForm((current) => {
        const pristine =
          !current.siteName && !current.cropName && Number(current.totalWeightLb) === 0;
        return pristine ? initialForm(nextSettings) : current;
      });
    });
    const stopPartners = subscribeToPartners(setPartners, () => setPartners([]));
    return () => {
      stopSettings();
      stopPartners();
    };
  }, []);

  const inputs = useMemo<BatchInputs>(
    () => ({
      seedCost: numberValue(form.seedCost),
      waterGallons: numberValue(form.waterGallons),
      laborHours: numberValue(form.laborHours),
      materialsCost: numberValue(form.materialsCost),
      transportGasGallons: numberValue(form.transportGasGallons),
      electricityKwh: method === "hydroponic" ? numberValue(form.electricityKwh) : 0,
    }),
    [form, method],
  );

  const rates = useMemo<BatchRates>(
    () => ({
      pricePerLb: numberValue(form.pricePerLb),
      waterRatePerGallon: numberValue(form.waterRatePerGallon),
      laborRatePerHour: numberValue(form.laborRatePerHour),
      electricityRatePerKwh: numberValue(form.electricityRatePerKwh),
      gasRatePerGallon: numberValue(form.gasRatePerGallon),
      fossilFuelExternalityPerGallon: numberValue(
        form.fossilFuelExternalityPerGallon,
      ),
    }),
    [form],
  );

  const metrics = useMemo<HarvestMetrics>(
    () => ({
      totalWeightLb: numberValue(form.totalWeightLb),
      missedWeightLb: numberValue(form.missedWeightLb),
      compostableWeightLb: numberValue(form.compostableWeightLb),
    }),
    [form],
  );

  const preview = useMemo(
    () => calculateBatchFinancials({ method, inputs, rates, metrics }),
    [inputs, method, metrics, rates],
  );

  function updateField(key: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
    setMessage("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (metrics.missedWeightLb > metrics.totalWeightLb) {
      setError("Missed weight cannot exceed the total harvested weight.");
      return;
    }
    if (metrics.compostableWeightLb > metrics.missedWeightLb) {
      setError("Compostable weight must be part of the missed weight.");
      return;
    }

    setSubmitting(true);
    try {
      await createHarvestBatch({
        method,
        siteName: form.siteName.trim(),
        cropName: form.cropName.trim(),
        harvestDate: dateStringToTimestamp(form.harvestDate),
        reportingPeriod: form.reportingPeriod,
        assignedPartnerId: form.assignedPartnerId,
        inputs,
        rates,
        metrics,
        ...preview,
        createdBy: userId,
        updatedBy: userId,
      });
      setForm(initialForm(settings));
      setMessage("Harvest batch saved and included in live analytics.");
    } catch {
      setError("The batch could not be saved. Check your access and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="batch-layout">
      <form className="content-card batch-form" onSubmit={handleSubmit}>
        <div className="section-heading section-heading--compact">
          <div>
            <p className="eyebrow">Growing method</p>
            <h2>New harvest batch</h2>
          </div>
          <span className="status-pill">Live calculation</span>
        </div>

        <div className="method-tabs" role="tablist" aria-label="Growing method">
          <button
            type="button"
            role="tab"
            aria-selected={method === "soil"}
            className={method === "soil" ? "is-active" : ""}
            onClick={() => setMethod("soil")}
          >
            <span className="method-icon">S</span>
            <span><strong>Soil</strong><small>Traditional growing</small></span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={method === "hydroponic"}
            className={method === "hydroponic" ? "is-active" : ""}
            onClick={() => setMethod("hydroponic")}
          >
            <span className="method-icon method-icon--blue">H</span>
            <span><strong>Hydroponics</strong><small>Machine-assisted</small></span>
          </button>
        </div>

        <fieldset>
          <legend>Batch details</legend>
          <div className="form-grid form-grid--three">
            <TextField label="Site / location" value={form.siteName} onChange={(value) => updateField("siteName", value)} placeholder="South Ward Garden" required />
            <TextField label="Crop" value={form.cropName} onChange={(value) => updateField("cropName", value)} placeholder="Leaf lettuce" required />
            <label className="field"><span>Harvest date</span><input type="date" value={form.harvestDate} onChange={(event) => updateField("harvestDate", event.target.value)} required /></label>
            <label className="field"><span>Reporting period</span><select value={form.reportingPeriod} onChange={(event) => updateField("reportingPeriod", event.target.value)}><option value="daily">Daily</option><option value="weekly">Weekly</option></select></label>
            <label className="field field--span-two"><span>Assigned partner</span><select value={form.assignedPartnerId} onChange={(event) => updateField("assignedPartnerId", event.target.value)}><option value="">Unassigned</option>{partners.map((partner) => <option value={partner.id} key={partner.id}>{partner.displayName} · {partner.organizationName}</option>)}</select></label>
          </div>
        </fieldset>

        <fieldset>
          <legend>Shared logistics &amp; consumables</legend>
          <p className="fieldset-note">Applied to both soil and hydroponic distribution.</p>
          <div className="form-grid form-grid--three">
            <NumberField label="Seed cost" prefix="$" value={form.seedCost} onChange={(value) => updateField("seedCost", value)} />
            <NumberField label="Water used" suffix="gal" value={form.waterGallons} onChange={(value) => updateField("waterGallons", value)} />
            <NumberField label="Labor time" suffix="hrs" value={form.laborHours} onChange={(value) => updateField("laborHours", value)} />
            <NumberField label="Materials cost" prefix="$" value={form.materialsCost} onChange={(value) => updateField("materialsCost", value)} />
            <NumberField label="Transport gas" suffix="gal" value={form.transportGasGallons} onChange={(value) => updateField("transportGasGallons", value)} />
            <div className="calculated-field"><span>Gas + externality</span><strong>{formatCurrency(preview.costs.transportGasCost + preview.costs.fossilFuelExternalityCost)}</strong><small>Calculated from both gas rates</small></div>
          </div>
        </fieldset>

        {method === "hydroponic" ? (
          <fieldset className="hydro-fieldset">
            <legend>Hydroponic machine</legend>
            <div className="form-grid form-grid--three">
              <NumberField label="Electricity used" suffix="kWh" value={form.electricityKwh} onChange={(value) => updateField("electricityKwh", value)} />
              <div className="calculated-field"><span>Electricity cost</span><strong>{formatCurrency(preview.costs.electricityCost)}</strong><small>{formatCurrency(rates.electricityRatePerKwh)} per kWh</small></div>
            </div>
          </fieldset>
        ) : null}

        <fieldset>
          <legend>Harvest metrics</legend>
          <div className="form-grid form-grid--three">
            <NumberField label="Total weight" suffix="lb" value={form.totalWeightLb} onChange={(value) => updateField("totalWeightLb", value)} />
            <NumberField label="Weight missed" suffix="lb" value={form.missedWeightLb} onChange={(value) => updateField("missedWeightLb", value)} />
            <NumberField label="Weight compostable" suffix="lb" value={form.compostableWeightLb} onChange={(value) => updateField("compostableWeightLb", value)} />
          </div>
        </fieldset>

        <details className="override-panel">
          <summary><span><strong>Local rate overrides</strong><small>Prefilled from global settings</small></span><span>Adjust rates</span></summary>
          <div className="form-grid form-grid--three override-panel__grid">
            <NumberField label="Selling price / lb" prefix="$" value={form.pricePerLb} onChange={(value) => updateField("pricePerLb", value)} step="0.01" />
            <NumberField label="Water rate / gal" prefix="$" value={form.waterRatePerGallon} onChange={(value) => updateField("waterRatePerGallon", value)} step="0.001" />
            <NumberField label="Labor rate / hr" prefix="$" value={form.laborRatePerHour} onChange={(value) => updateField("laborRatePerHour", value)} step="0.01" />
            <NumberField label="Gas rate / gal" prefix="$" value={form.gasRatePerGallon} onChange={(value) => updateField("gasRatePerGallon", value)} step="0.01" />
            <NumberField label="Externality / gal" prefix="$" value={form.fossilFuelExternalityPerGallon} onChange={(value) => updateField("fossilFuelExternalityPerGallon", value)} step="0.01" />
            {method === "hydroponic" ? <NumberField label="Electricity / kWh" prefix="$" value={form.electricityRatePerKwh} onChange={(value) => updateField("electricityRatePerKwh", value)} step="0.001" /> : null}
          </div>
        </details>

        {message ? <p className="form-message form-message--success">{message}</p> : null}
        {error ? <p className="form-message form-message--error">{error}</p> : null}
        <div className="form-actions">
          <button className="button button--primary" disabled={submitting}>{submitting ? "Saving batch…" : "Save harvest batch"}</button>
        </div>
      </form>

      <aside className="content-card financial-preview">
        <p className="eyebrow">Batch forecast</p>
        <h2>{method === "soil" ? "Soil" : "Hydroponic"} profitability</h2>
        <div className="preview-yield"><span>Sellable yield</span><strong>{preview.financials.sellableYieldLb.toFixed(1)} lb</strong><small>Total weight less missed weight</small></div>
        <dl>
          <div><dt>Projected revenue</dt><dd>{formatCurrency(preview.financials.revenue)}</dd></div>
          <div><dt>Total costs</dt><dd>−{formatCurrency(preview.financials.totalCosts)}</dd></div>
          <div className="preview-profit"><dt>Projected profit</dt><dd className={preview.financials.profit < 0 ? "is-negative" : ""}>{formatCurrency(preview.financials.profit)}</dd></div>
        </dl>
        <div className="cost-breakdown">
          <span>Cost snapshot</span>
          <div><small>Labor</small><span>{formatCurrency(preview.costs.laborCost)}</span></div>
          <div><small>Water</small><span>{formatCurrency(preview.costs.waterCost)}</span></div>
          <div><small>Distribution</small><span>{formatCurrency(preview.costs.transportGasCost + preview.costs.fossilFuelExternalityCost)}</span></div>
          {method === "hydroponic" ? <div><small>Electricity</small><span>{formatCurrency(preview.costs.electricityCost)}</span></div> : null}
        </div>
      </aside>
    </section>
  );
}

function numberValue(value: string) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

function TextField({ label, value, onChange, placeholder, required = false }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; required?: boolean }) {
  return <label className="field"><span>{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required={required} /></label>;
}

function NumberField({ label, value, onChange, prefix, suffix, step = "0.1" }: { label: string; value: string; onChange: (value: string) => void; prefix?: string; suffix?: string; step?: string }) {
  return <label className="field"><span>{label}</span><span className="input-affix">{prefix ? <span>{prefix}</span> : null}<input type="number" min="0" step={step} value={value} onChange={(event) => onChange(event.target.value)} required />{suffix ? <span>{suffix}</span> : null}</span></label>;
}
