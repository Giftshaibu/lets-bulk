import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { SettingsPanel } from "@/features/settings-panel";
import { SignOut } from "@/features/sign-out";
export const Route = createFileRoute("/settings")({ component: Settings });
function Settings() {
  return (
    <AppShell title="Settings" subtitle="Your goals, preferences and equipment">
      <SettingsPanel />
      <SignOut />
    </AppShell>
  );
}
