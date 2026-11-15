import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, ChunkyButton, SectionTitle } from "@/components/kit";
import { useAppData, api } from "./app-data";
import { inputClass, NumberField } from "./setup";
import { browserDb } from "@/lib/db/client";
import type {
  budgetSuggestions,
  budgetSummary,
  substitutions,
} from "@/lib/services/review.service";
const num = (f: FormData, key: string) => Number(f.get(key));
export function DailyForms() {
  const { data, act, pending } = useAppData();
  return (
    <Card>
      <SectionTitle>Daily logs</SectionTitle>
      <div className="grid gap-5 sm:grid-cols-2">
        <form
          className="grid gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void act("/api/water", {
              id: crypto.randomUUID(),
              date: data.date,
              amount_ml: num(new FormData(e.currentTarget), "water"),
            });
          }}
        >
          <p className="font-bold">
            Water: {data.waterTotal} / {data.rawProfile?.water_target_ml} ml
          </p>
          <NumberField
            name="water"
            label="Add water (ml)"
            value={250}
            min={1}
            max={10000}
            step="1"
          />
          <ChunkyButton disabled={pending}>Add water</ChunkyButton>
        </form>
        <form
          className="grid gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            void act("/api/recovery", {
              date: data.date,
              sleep_hours: num(f, "sleep"),
              energy: num(f, "energy"),
              soreness: num(f, "soreness"),
              stress: num(f, "stress"),
            });
          }}
        >
          <p className="font-bold">
            Recovery:{" "}
            {data.recovery.score === null
              ? "not logged"
              : `${data.recovery.score}/100 · ${data.recovery.status}`}
          </p>
          <NumberField
            name="sleep"
            label="Sleep (hours)"
            min={0}
            max={24}
            value={data.recovery.logged ? data.recovery.sleepHours : 8}
          />
          <div className="grid grid-cols-3 gap-2">
            {["energy", "soreness", "stress"].map((k) => (
              <NumberField
                key={k}
                name={k}
                label={`${k} (1–5)`}
                value={3}
                min={1}
                max={5}
                step="1"
              />
            ))}
          </div>
          <ChunkyButton disabled={pending}>Save recovery</ChunkyButton>
        </form>
      </div>
    </Card>
  );
}
