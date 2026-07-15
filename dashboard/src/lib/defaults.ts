import type { GlobalSettings } from "@/types/firestore";

export const DEFAULT_SETTINGS: GlobalSettings = {
  defaultPricePerLb: 3.5,
  defaultSeedCost: 12,
  defaultMaterialsCost: 15,
  waterRatePerGallon: 0.006,
  laborRatePerHour: 18,
  electricityRatePerKwh: 0.18,
  gasRatePerGallon: 3.25,
  fossilFuelExternalityPerGallon: 0.55,
  updatedAt: null,
  updatedBy: "",
};
