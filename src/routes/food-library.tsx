import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { FoodTools } from "@/features/food-tools";
export const Route = createFileRoute("/food-library")({ component: Library });
function Library() {
  return (
    <AppShell title="Food tools" subtitle="Saved meals, custom foods and local prices">
      <FoodTools />
    </AppShell>
  );
}
