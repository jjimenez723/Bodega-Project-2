import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type FirestoreError,
  type Unsubscribe,
} from "firebase/firestore";
import { calculateBatchFinancials } from "@/lib/calculations";
import { DEFAULT_SETTINGS } from "@/lib/defaults";
import { db } from "@/lib/firebase/client";
import type {
  AppUser,
  GlobalSettings,
  HarvestBatch,
  HarvestMetrics,
  NewHarvestBatch,
  UserRole,
} from "@/types/firestore";

type ErrorHandler = (error: FirestoreError) => void;

function requireDb() {
  if (!db) {
    throw new Error("Firebase is not configured.");
  }
  return db;
}

export function subscribeToSettings(
  callback: (settings: GlobalSettings) => void,
  onError?: ErrorHandler,
): Unsubscribe {
  return onSnapshot(
    doc(requireDb(), "settings", "global"),
    (snapshot) => {
      callback(
        snapshot.exists()
          ? ({ ...DEFAULT_SETTINGS, ...snapshot.data() } as GlobalSettings)
          : DEFAULT_SETTINGS,
      );
    },
    onError,
  );
}

export function subscribeToBatches(
  role: UserRole,
  userId: string,
  callback: (batches: HarvestBatch[]) => void,
  onError?: ErrorHandler,
): Unsubscribe {
  const batchesRef = collection(requireDb(), "harvestBatches");
  const batchesQuery =
    role === "partner"
      ? query(batchesRef, where("assignedPartnerId", "==", userId))
      : query(batchesRef);

  return onSnapshot(
    batchesQuery,
    (snapshot) => {
      const batches = snapshot.docs
        .map((batchDoc) => ({
          id: batchDoc.id,
          ...batchDoc.data(),
        })) as HarvestBatch[];
      batches.sort(
        (a, b) => b.harvestDate.toMillis() - a.harvestDate.toMillis(),
      );
      callback(batches);
    },
    onError,
  );
}

export function subscribeToPartners(
  callback: (partners: AppUser[]) => void,
  onError?: ErrorHandler,
): Unsubscribe {
  const partnersQuery = query(
    collection(requireDb(), "users"),
    where("role", "==", "partner"),
  );

  return onSnapshot(
    partnersQuery,
    (snapshot) => {
      const partners = snapshot.docs
        .map(
          (userDoc) =>
            ({ id: userDoc.id, ...userDoc.data() }) as AppUser,
        )
        .filter((partner) => partner.active);
      partners.sort((a, b) => a.displayName.localeCompare(b.displayName));
      callback(partners);
    },
    onError,
  );
}

export async function saveGlobalSettings(
  settings: Omit<GlobalSettings, "updatedAt" | "updatedBy">,
  userId: string,
) {
  await setDoc(doc(requireDb(), "settings", "global"), {
    ...settings,
    updatedAt: serverTimestamp(),
    updatedBy: userId,
  });
}

export async function createHarvestBatch(batch: NewHarvestBatch) {
  await addDoc(collection(requireDb(), "harvestBatches"), {
    ...batch,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateHarvestMetrics(
  batch: HarvestBatch,
  metrics: HarvestMetrics,
  userId: string,
) {
  const { financials } = calculateBatchFinancials({
    method: batch.method,
    inputs: batch.inputs,
    rates: batch.rates,
    metrics,
  });

  await updateDoc(doc(requireDb(), "harvestBatches", batch.id), {
    metrics,
    financials,
    updatedAt: serverTimestamp(),
    updatedBy: userId,
  });
}

export function dateStringToTimestamp(date: string) {
  return Timestamp.fromDate(new Date(`${date}T12:00:00`));
}
