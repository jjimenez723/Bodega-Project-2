import type { Timestamp } from "firebase/firestore";

export type UserRole = "admin" | "project_manager" | "partner";
export type GrowingMethod = "soil" | "hydroponic";
export type ReportingPeriod = "daily" | "weekly";

export interface AppUser {
  id: string;
  email: string;
  displayName: string;
  organizationName: string;
  role: UserRole;
  active: boolean;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface GlobalSettings {
  defaultPricePerLb: number;
  defaultSeedCost: number;
  defaultMaterialsCost: number;
  waterRatePerGallon: number;
  laborRatePerHour: number;
  electricityRatePerKwh: number;
  gasRatePerGallon: number;
  fossilFuelExternalityPerGallon: number;
  updatedAt: Timestamp | null;
  updatedBy: string;
}

export interface BatchInputs {
  seedCost: number;
  waterGallons: number;
  laborHours: number;
  materialsCost: number;
  transportGasGallons: number;
  electricityKwh: number;
}

export interface BatchRates {
  pricePerLb: number;
  waterRatePerGallon: number;
  laborRatePerHour: number;
  electricityRatePerKwh: number;
  gasRatePerGallon: number;
  fossilFuelExternalityPerGallon: number;
}

export interface BatchCosts {
  seedCost: number;
  waterCost: number;
  laborCost: number;
  materialsCost: number;
  transportGasCost: number;
  fossilFuelExternalityCost: number;
  electricityCost: number;
}

export interface HarvestMetrics {
  totalWeightLb: number;
  missedWeightLb: number;
  compostableWeightLb: number;
}

export interface BatchFinancials {
  sellableYieldLb: number;
  revenue: number;
  totalCosts: number;
  profit: number;
}

export interface HarvestBatch {
  id: string;
  method: GrowingMethod;
  siteName: string;
  cropName: string;
  harvestDate: Timestamp;
  reportingPeriod: ReportingPeriod;
  assignedPartnerId: string;
  inputs: BatchInputs;
  rates: BatchRates;
  costs: BatchCosts;
  metrics: HarvestMetrics;
  financials: BatchFinancials;
  createdBy: string;
  updatedBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type NewHarvestBatch = Omit<
  HarvestBatch,
  "id" | "createdAt" | "updatedAt"
>;
