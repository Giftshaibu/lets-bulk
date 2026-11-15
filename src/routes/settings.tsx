import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { SettingsPanel } from "@/features/settings-panel";
import { browserDb } from "@/lib/db/client";
export const Route = createFileRoute("/settings")({ component: Settings });
function Settings() {
  return (
    <AppShell title="Settings" subtitle="Your goals, preferences and equipment">
      <SettingsPanel />
      <button
        className="mt-6 min-h-11 font-bold underline"
        onClick={() => void browserDb().auth.signOut()}
      >
        Sign out
      </button>
    </AppShell>
  );
}
