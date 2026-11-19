import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, ChunkyButton, SectionTitle } from "@/components/kit";
import { DateStepper, NumberStepper, RatingChips } from "@/components/stepper";
import { Droplets, Check } from "lucide-react";
import { useAppData, api } from "./app-data";
import { units, volumeFromMl, volumeToMl, volumeLabel } from "@/lib/domain/units";
export function DailyForms() {
  const { data, act, pending } = useAppData();
  const preferred = units(data.preferences);
  const [chosenDay, setChosenDay] = useState<string | null>(null),
    [amount, setAmount] = useState(250),
    [sleep, setSleep] = useState(8),
    [energy, setEnergy] = useState(3),
    [soreness, setSoreness] = useState(3),
    [stress, setStress] = useState(3);
  const date = chosenDay ?? data.date;
  const historical = useQuery({
    queryKey: ["daily-logs", data.rawProfile?.user_id, date],
    queryFn: () =>
      api<{ waterTotal: number; recovery: typeof data.recovery }>(`/api/daily-logs?date=${date}`),
    enabled: date !== data.date,
  });
  const shown =
    date === data.date ? { waterTotal: data.waterTotal, recovery: data.recovery } : historical.data;
  return (
    <Card>
      <SectionTitle>Daily logs</SectionTitle>
      <DateStepper
        value={date}
        today={data.date}
        onChange={(d) => setChosenDay(d === data.date ? null : d)}
        disabled={pending}
      />
      {date !== data.date && historical.isPending && <p role="status">Loading this day…</p>}
      {historical.isError && date !== data.date && (
        <p role="alert">Couldn’t load this day. Try again before saving.</p>
      )}
      <div className="mt-5 grid gap-6">
        <form
          className="grid gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            await act("/api/water", { id: crypto.randomUUID(), date, amount_ml: amount });
          }}
        >
          <p className="font-bold">
            Water: {shown ? volumeLabel(shown.waterTotal, preferred.volume) : "—"} /{" "}
            {volumeLabel(data.rawProfile?.water_target_ml ?? 2500, preferred.volume)}
          </p>
          <NumberStepper
            label="Water to add"
            value={volumeFromMl(amount, preferred.volume)}
            onChange={(n) => setAmount(volumeToMl(n, preferred.volume))}
            step={preferred.volume === "ml" ? 250 : 8}
            min={volumeFromMl(1, preferred.volume)}
            max={volumeFromMl(10000, preferred.volume)}
            suffix={preferred.volume === "ml" ? "ml" : "US fl oz"}
            disabled={pending}
          />
          <ChunkyButton disabled={pending || !shown}>
            <Droplets className="h-5 w-5" />
            Add water
          </ChunkyButton>
          <p className="text-xs text-muted-foreground">
            First water log for this date earns 15 XP.
          </p>
        </form>
        <form
          className="grid gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            await act("/api/recovery", { date, sleep_hours: sleep, energy, soreness, stress });
          }}
        >
          <p className="font-bold">
            Recovery:{" "}
            {shown?.recovery.logged
              ? `${shown.recovery.score}/100 · ${shown.recovery.status}`
              : "Not logged"}
          </p>
          <NumberStepper
            label="Sleep"
            value={sleep}
            onChange={setSleep}
            min={0}
            max={24}
            step={0.5}
            suffix="hrs"
            disabled={pending}
          />
          <div className="grid gap-4">
            <RatingChips label="Energy (1–5)" value={energy} onChange={setEnergy} />
            <RatingChips label="Soreness (1–5)" value={soreness} onChange={setSoreness} />
            <RatingChips label="Stress (1–5)" value={stress} onChange={setStress} />
          </div>
          <ChunkyButton disabled={pending || !shown}>
            <Check className="h-5 w-5" />
            Save recovery
          </ChunkyButton>
        </form>
      </div>
    </Card>
  );
}
