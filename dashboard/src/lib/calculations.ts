import type {
  BatchCosts,
  BatchFinancials,
  BatchInputs,
  BatchRates,
  GrowingMethod,
  HarvestMetrics,
} from "@/types/firestore";

type CalculationInput = {
  method: GrowingMethod;
  inputs: BatchInputs;
  rates: BatchRates;
  metrics: HarvestMetrics;
};

export function calculateBatchFinancials({
  method,
  inputs,
  rates,
  metrics,
}: CalculationInput): { costs: BatchCosts; financials: BatchFinancials } {
  const costs: BatchCosts = {
    seedCost: inputs.seedCost,
    waterCost: inputs.waterGallons * rates.waterRatePerGallon,
    laborCost: inputs.laborHours * rates.laborRatePerHour,
    materialsCost: inputs.materialsCost,
    transportGasCost: inputs.transportGasGallons * rates.gasRatePerGallon,
    fossilFuelExternalityCost:
      inputs.transportGasGallons * rates.fossilFuelExternalityPerGallon,
    electricityCost:
      method === "hydroponic"
        ? inputs.electricityKwh * rates.electricityRatePerKwh
        : 0,
  };

  const sellableYieldLb = Math.max(
    0,
    metrics.totalWeightLb - metrics.missedWeightLb,
  );
  const totalCosts =
    costs.seedCost +
    costs.waterCost +
    costs.laborCost +
    costs.materialsCost +
    costs.transportGasCost +
    costs.fossilFuelExternalityCost +
    costs.electricityCost;
  const revenue = rates.pricePerLb * sellableYieldLb;

  return {
    costs,
    financials: {
      sellableYieldLb,
      revenue,
      totalCosts,
      profit: revenue - totalCosts,
    },
  };
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(value: number, digits = 1) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
  }).format(value);
}
