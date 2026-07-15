"use client";

import { useState } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { GlobalSettingsPanel } from "@/components/dashboard/GlobalSettingsPanel";
import { HarvestBatchForm } from "@/components/dashboard/HarvestBatchForm";
import { PartnerMetricsForm } from "@/components/dashboard/PartnerMetricsForm";
import { ProfitabilityAnalytics } from "@/components/dashboard/ProfitabilityAnalytics";
import { useAuth } from "@/contexts/AuthContext";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import type { UserRole } from "@/types/firestore";

type Section = "overview" | "harvest" | "settings";

const roleLabels: Record<UserRole, string> = {
  admin: "Admin / Lead Engineer",
  project_manager: "Project Manager",
  partner: "Bodega Partner",
};

export function Dashboard() {
  const { user, profile, loading, profileError, signOut } = useAuth();
  const [section, setSection] = useState<Section>("overview");

  if (!isFirebaseConfigured) return <FirebaseSetupNotice />;
  if (loading) return <LoadingScreen />;
  if (!user) return <LoginForm />;
  if (!profile || !profile.active) {
    return (
      <main className="centered-state">
        <div className="brand-mark">BP</div>
        <p className="eyebrow">Access pending</p>
        <h1>No active dashboard role</h1>
        <p className="muted">
          {profileError || "Ask an administrator to activate your user profile."}
        </p>
        <button className="button button--secondary" onClick={() => void signOut()}>
          Sign out
        </button>
      </main>
    );
  }

  const canManageBatches = profile.role !== "partner";
  const sectionTitle =
    section === "overview"
      ? "Profitability overview"
      : section === "settings"
        ? "Global settings"
        : canManageBatches
          ? "Record a harvest"
          : "Submit harvest metrics";

  return (
    <div className="dashboard-shell">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <div className="brand-mark brand-mark--small">BP</div>
          <div>
            <strong>Bodega Project</strong>
            <span>Profitability</span>
          </div>
        </div>

        <nav className="sidebar__nav" aria-label="Dashboard navigation">
          <button
            className={section === "overview" ? "is-active" : ""}
            onClick={() => setSection("overview")}
          >
            <OverviewIcon />
            Overview
          </button>
          <button
            className={section === "harvest" ? "is-active" : ""}
            onClick={() => setSection("harvest")}
          >
            <HarvestIcon />
            {canManageBatches ? "New harvest" : "Report metrics"}
          </button>
          {profile.role === "admin" ? (
            <button
              className={section === "settings" ? "is-active" : ""}
              onClick={() => setSection("settings")}
            >
              <SettingsIcon />
              Global settings
            </button>
          ) : null}
        </nav>

        <div className="sidebar__foot">
          <div className="user-avatar" aria-hidden="true">
            {profile.displayName.charAt(0).toUpperCase() || "B"}
          </div>
          <div className="sidebar__identity">
            <strong>{profile.displayName}</strong>
            <span>{roleLabels[profile.role]}</span>
          </div>
          <button className="icon-button" onClick={() => void signOut()} aria-label="Sign out">
            <SignOutIcon />
          </button>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <p className="eyebrow">Network intelligence</p>
            <h1>{sectionTitle}</h1>
          </div>
          <div className="header-date">
            <span>Today</span>
            <strong>
              {new Intl.DateTimeFormat("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              }).format(new Date())}
            </strong>
          </div>
        </header>

        {section === "overview" ? (
          <ProfitabilityAnalytics profile={profile} />
        ) : null}
        {section === "harvest" && canManageBatches ? (
          <HarvestBatchForm userId={user.uid} />
        ) : null}
        {section === "harvest" && !canManageBatches ? (
          <PartnerMetricsForm profile={profile} />
        ) : null}
        {section === "settings" && profile.role === "admin" ? (
          <GlobalSettingsPanel userId={user.uid} />
        ) : null}
      </main>
    </div>
  );
}

function LoadingScreen() {
  return (
    <main className="centered-state">
      <div className="brand-mark brand-mark--pulse">BP</div>
      <p className="muted">Loading your dashboard…</p>
    </main>
  );
}

function FirebaseSetupNotice() {
  return (
    <main className="centered-state">
      <div className="brand-mark">BP</div>
      <p className="eyebrow">Configuration required</p>
      <h1>Connect the Firebase project</h1>
      <p className="muted centered-state__copy">
        Copy <code>.env.local.example</code> to <code>.env.local</code>, then add the
        web app credentials from Firebase Console and restart the development server.
      </p>
    </main>
  );
}

function OverviewIcon() {
  return <svg viewBox="0 0 24 24"><path d="M4 13h6V4H4v9Zm0 7h6v-4H4v4Zm10 0h6v-9h-6v9Zm0-16v4h6V4h-6Z" /></svg>;
}

function HarvestIcon() {
  return <svg viewBox="0 0 24 24"><path d="M12 21v-8m0 0C6.5 13 4 10 4 5c5.5 0 8 3 8 8Zm0 3c4.8 0 7-2.6 7-7-4.8 0-7 2.6-7 7Z" /></svg>;
}

function SettingsIcon() {
  return <svg viewBox="0 0 24 24"><path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Zm7-3.2c0-.5-.1-1-.2-1.4l2-1.5-2-3.4-2.4 1a8 8 0 0 0-2.4-1.4L13.7 3h-4l-.4 2.3A8 8 0 0 0 7 6.7l-2.3-1-2 3.4 1.9 1.5a7.5 7.5 0 0 0 0 2.8l-2 1.5 2 3.4 2.4-1a8 8 0 0 0 2.4 1.4l.4 2.3h4l.4-2.3a8 8 0 0 0 2.4-1.4l2.3 1 2-3.4-1.9-1.5c.1-.5.2-.9.2-1.4Z" /></svg>;
}

function SignOutIcon() {
  return <svg viewBox="0 0 24 24"><path d="M10 5H5v14h5m4-3 4-4-4-4m4 4H9" /></svg>;
}
