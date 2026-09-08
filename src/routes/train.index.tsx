import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Trophy } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { BigStat, Card, ChunkyButton, Pill, SectionTitle } from "@/components/kit";
import { getLifts, getTodaysWorkout, getWeekSchedule } from "@/lib/data/service";

export const Route = createFileRoute("/train/active")({
  head: () => ({ meta: [] }),
  component: () => null,
});
