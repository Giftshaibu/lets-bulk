import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { FoodHelper } from "@/features/food-ai";
export const Route = createFileRoute("/food-helper")({
  validateSearch: z.object({ mode: z.enum(["parse", "meals"]).catch("parse") }),
  component: Page,
});
function Page() {
  const { mode } = Route.useSearch();
  return <FoodHelper key={mode} mode={mode} />;
}
