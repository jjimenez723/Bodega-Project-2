"use client";

import { useEffect, useState, type FormEvent } from "react";
import { DEFAULT_SETTINGS } from "@/lib/defaults";
import {
  saveGlobalSettings,
  subscribeToSettings,
} from "@/lib/firebase/firestore";
import type { GlobalSettings } from "@/types/firestore";

type EditableKey = Exclude<keyof GlobalSettings, "updatedAt" | "updatedBy">;

const fields: Array<{
  key: EditableKey;
  label: string;
  description: string;
  prefix?: string;
  suffix?: string;
  step: string;
}> = [
  {
    key: "defaultPricePerLb",
    label: "Default selling price",
    description: "Baseline revenue earned per sellable pound.",
    prefix: "$",
    suffix: "/ lb",
    step: "0.01",
  },
  {
    key: "laborRatePerHour",
    label: "Standard labor rate",
    description: "Hourly labor rate used for new harvest batches.",
    prefix: "$",
    suffix: "/ hr",
    step: "0.01",
  },
  {
    key: "waterRatePerGallon",
    label: "Water rate",
    description: "Local water cost applied to recorded gallons.",
    prefix: "$",
    suffix: "/ gal",
    step: "0.001",
  },
  {
    key: "electricityRatePerKwh",
    label: "Electricity rate",
    description: "Hydroponic machine electricity baseline.",
    prefix: "$",
    suffix: "/ kWh",
    step: "0.001",
  },
  {
    key: "gasRatePerGallon",
    label: "Transport gas rate",
    description: "Fuel cost used by both soil and hydroponic batches.",
    prefix: "$",
    suffix: "/ gal",
    step: "0.01",
  },
  {
    key: "fossilFuelExternalityPerGallon",
    label: "Fossil-fuel externality",
    description: "Estimated social and environmental cost per gallon burned.",
    prefix: "$",
    suffix: "/ gal",
    step: "0.01",
  },
  {
    key: "defaultSeedCost",
    label: "Default seed cost",
    description: "Starting direct seed cost for each new batch.",
    prefix: "$",
    step: "0.01",
  },
  {
    key: "defaultMaterialsCost",
    label: "Default materials cost",
    description: "Starting consumables and materials cost for each batch.",
    prefix: "$",
    step: "0.01",
  },
];

export function GlobalSettingsPanel({ userId }: { userId: string }) {
  const [settings, setSettings] = useState<GlobalSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(
    () =>
      subscribeToSettings(
        (nextSettings) => {
          setSettings(nextSettings);
          setLoading(false);
        },
        () => {
          setError("Global settings could not be loaded.");
          setLoading(false);
        },
      ),
    [],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      await saveGlobalSettings(
        {
          defaultPricePerLb: settings.defaultPricePerLb,
          defaultSeedCost: settings.defaultSeedCost,
          defaultMaterialsCost: settings.defaultMaterialsCost,
          waterRatePerGallon: settings.waterRatePerGallon,
          laborRatePerHour: settings.laborRatePerHour,
          electricityRatePerKwh: settings.electricityRatePerKwh,
          gasRatePerGallon: settings.gasRatePerGallon,
          fossilFuelExternalityPerGallon:
            settings.fossilFuelExternalityPerGallon,
        },
        userId,
      );
      setMessage("Global baselines saved. New batches will start with these rates.");
    } catch {
      setError("Settings were not saved. Confirm your admin role and try again.");
    } finally {
      setSaving(false);
    }
  }

  function updateSetting(key: EditableKey, value: string) {
    setSettings((current) => ({
      ...current,
      [key]: Number(value),
    }));
  }

  return (
    <section className="content-card settings-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Admin controls</p>
          <h2>Master financial baselines</h2>
          <p className="muted">
            These values prefill new batches. Project managers can override them
            when local costs fluctuate without changing the global defaults.
          </p>
        </div>
        <span className="status-pill status-pill--secure">Admin only</span>
      </div>

      {loading ? <p className="muted">Loading settings…</p> : null}
      {!loading ? (
        <form onSubmit={handleSubmit}>
          <div className="settings-grid">
            {fields.map((field) => (
              <label className="setting-row" key={field.key}>
                <span className="setting-row__copy">
                  <strong>{field.label}</strong>
                  <small>{field.description}</small>
                </span>
                <span className="number-control">
                  {field.prefix ? <span>{field.prefix}</span> : null}
                  <input
                    type="number"
                    min="0"
                    step={field.step}
                    value={settings[field.key]}
                    onChange={(event) => updateSetting(field.key, event.target.value)}
                    required
                  />
                  {field.suffix ? <span>{field.suffix}</span> : null}
                </span>
              </label>
            ))}
          </div>
          {message ? <p className="form-message form-message--success">{message}</p> : null}
          {error ? <p className="form-message form-message--error">{error}</p> : null}
          <div className="form-actions">
            <button className="button button--primary" disabled={saving}>
              {saving ? "Saving…" : "Save global settings"}
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
