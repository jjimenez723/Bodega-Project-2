# Bodega Profitability Dashboard

A standalone Next.js App Router dashboard backed exclusively by Firebase Auth and Cloud Firestore. It lives beside the existing Vite site so the current public pages continue to build unchanged.

## What is included

- Real-time soil vs. hydroponic profitability analytics
- Role-aware Firebase Auth context
- Admin global financial settings
- Project-manager batch creation and local rate overrides
- Partner-only entry for assigned harvest metrics
- Firestore schema types and field-validating Security Rules

## Firestore schema

The source-of-truth TypeScript interfaces are in `src/types/firestore.ts`. The deployed document layout is:

```text
settings/global
  defaultPricePerLb: number
  defaultSeedCost: number
  defaultMaterialsCost: number
  waterRatePerGallon: number
  laborRatePerHour: number
  electricityRatePerKwh: number
  gasRatePerGallon: number
  fossilFuelExternalityPerGallon: number
  updatedAt: Timestamp
  updatedBy: Auth UID

users/{authUid}
  email: string
  displayName: string
  organizationName: string
  role: "admin" | "project_manager" | "partner"
  active: boolean
  createdAt: Timestamp
  updatedAt: Timestamp

harvestBatches/{batchId}
  method: "soil" | "hydroponic"
  siteName: string
  cropName: string
  harvestDate: Timestamp
  reportingPeriod: "daily" | "weekly"
  assignedPartnerId: Auth UID | ""
  inputs:
    seedCost: number
    waterGallons: number
    laborHours: number
    materialsCost: number
    transportGasGallons: number
    electricityKwh: number             # 0 for soil
  rates:                                # per-batch snapshot / overrides
    pricePerLb: number
    waterRatePerGallon: number
    laborRatePerHour: number
    electricityRatePerKwh: number
    gasRatePerGallon: number
    fossilFuelExternalityPerGallon: number
  costs:
    seedCost: number
    waterCost: number
    laborCost: number
    materialsCost: number
    transportGasCost: number
    fossilFuelExternalityCost: number
    electricityCost: number            # 0 for soil
  metrics:
    totalWeightLb: number
    missedWeightLb: number
    compostableWeightLb: number
  financials:
    sellableYieldLb: number             # total - missed
    revenue: number                    # price/lb * sellable
    totalCosts: number                 # all cost fields
    profit: number                     # revenue - total costs
  createdBy: Auth UID
  updatedBy: Auth UID
  createdAt: Timestamp
  updatedAt: Timestamp
```

Rates and calculated costs are stored as a per-batch snapshot. Changing the global settings therefore affects new batches without rewriting historical financial results.

## RBAC behavior

| Capability | Admin / Lead Engineer | Project Manager | Partner |
| --- | --- | --- | --- |
| Read all batches and analytics | Yes | Yes | No; assigned batches only |
| Create batches | Yes | Yes | No |
| Override batch rates and costs | Yes | Yes | No |
| Enter harvest weights | Yes | Yes | Assigned batches only |
| Edit global settings | Yes | No | No |
| Assign roles / delete batches | Yes | No | No |

`firestore.rules` enforces these permissions independently of the frontend. Partner updates are limited to `metrics`, recalculated `financials`, `updatedAt`, and `updatedBy`. The rules also validate the financial formulas and prevent soil batches from carrying hydroponic electricity use or cost.

## Firebase setup

1. In Firebase Console, create or select a project, add a Web app, enable Firestore, and enable Email/Password under Authentication.
2. Copy `.env.local.example` to `.env.local` and fill in the Web app configuration.
3. Install dependencies and deploy the rules:

   ```bash
   npm install
   npx firebase-tools login
   npx firebase-tools use <project-id>
   npx firebase-tools deploy --only firestore
   ```

4. Create team members under Firebase Authentication. Bootstrap the first admin from a trusted terminal with Application Default Credentials or a service-account credential:

   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/service-account.json
   npm run role -- <firebase-auth-uid> admin "Bodega Project"
   ```

   Use the same command with `project_manager` or `partner` for additional users. Do not put the service-account file in this repository.

5. Start the dashboard:

   ```bash
   npm run dev
   ```

Open `http://localhost:3000`. The UI shows a configuration notice until all six public Firebase environment values are present.

## Verification

```bash
npm run typecheck
npm run lint
npm run build
```
