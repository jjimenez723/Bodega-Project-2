import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const [uid, role, organizationName = ""] = process.argv.slice(2);
const allowedRoles = new Set(["admin", "project_manager", "partner"]);

if (!uid || !allowedRoles.has(role)) {
  console.error(
    "Usage: npm run role -- <firebase-auth-uid> <admin|project_manager|partner> [organization-name]",
  );
  process.exit(1);
}

if (!getApps().length) {
  initializeApp({ credential: applicationDefault() });
}

const authUser = await getAuth().getUser(uid);
const userRef = getFirestore().collection("users").doc(uid);
const existing = await userRef.get();

await userRef.set(
  {
    email: authUser.email ?? "",
    displayName: authUser.displayName ?? authUser.email?.split("@")[0] ?? "Team member",
    organizationName,
    role,
    active: true,
    updatedAt: FieldValue.serverTimestamp(),
    ...(existing.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
  },
  { merge: true },
);

console.log(`Assigned ${role} to ${uid}.`);
