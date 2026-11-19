import { useRef, useState } from "react";
import { DateStepper, NumberStepper } from "@/components/stepper";
import { units, massFromKg, massToKg } from "@/lib/domain/units";
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
import { MascotFeedback } from "./mascot-feedback";
import { mascot, weightMascot, type MascotState } from "@/lib/domain/mascot";
const num = (f: FormData, key: string) => Number(f.get(key));
export function BodyForms({
  section = "weight",
}: {
  section?: "weight" | "measurements" | "photos";
}) {
  const { data, act, pending } = useAppData();
  return (
    <Card>
      <SectionTitle>
        {section === "weight"
          ? "Quick weight log"
          : section === "measurements"
            ? "Body measurements"
            : "Progress photos"}
      </SectionTitle>
      <div className="grid gap-4">
        {section === "weight" && <WeightForm />}
        {section === "measurements" && (
          <section>
            <form
              className="mt-2 grid grid-cols-2 gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                const body: Record<string, string | number> = { date: String(f.get("date")) };
                for (const k of ["chest_cm", "arm_cm", "waist_cm", "thigh_cm"])
                  if (f.get(k)) body[k] = num(f, k);
                void act("/api/measurements", body);
              }}
            >
              <label className="col-span-2">
                Date
                <input
                  className={inputClass}
                  type="date"
                  name="date"
                  defaultValue={data.date}
                  max={data.date}
                  required
                />
              </label>
              {["chest", "arm", "waist", "thigh"].map((k) => (
                <NumberField
                  key={k}
                  name={`${k}_cm`}
                  label={`${k} (cm)`}
                  min={1}
                  max={300}
                  required={false}
                />
              ))}
              <ChunkyButton disabled={pending}>Save measurements</ChunkyButton>
            </form>
          </section>
        )}
        {section === "photos" && <PhotoForm />}
      </div>
    </Card>
  );
}
function WeightForm() {
  const { data, act, pending } = useAppData();
  const preferred = units(data.preferences);
  const [selectedDate, setSelectedDate] = useState(data.date),
    [kgValue, setKgValue] = useState(
      () => data.weight.series.at(-1)?.kg ?? data.profile.startWeightKg,
    );
  const [busy, setBusy] = useState(false),
    [feedback, setFeedback] = useState<MascotState | null>(null);
  const saving = useRef(false);
  const state = busy
    ? mascot("thinking", "Saving your weigh-in…", 60)
    : (feedback ??
      mascot(
        "neutral",
        data.weight.series.length
          ? "Ready for your next weigh-in. Look for the trend, not a single number."
          : "No weigh-ins yet. Your first entry gives you a starting point.",
      ));
  return (
    <div>
      <MascotFeedback
        state={state}
        announce={busy || feedback !== null}
        label="Weight logging encouragement"
      />
      <form
        onChange={() => {
          if (!busy) setFeedback(null);
        }}
        onSubmit={async (e) => {
          e.preventDefault();
          if (saving.current || pending) return;
          const f = new FormData(e.currentTarget),
            date = String(f.get("date")),
            kg = kgValue;
          const result = weightMascot(data.weight.series, date, kg);
          saving.current = true;
          setBusy(true);
          setFeedback(null);
          try {
            const saved = await act("/api/weight", { date, weight_kg: kg });
            setFeedback(
              saved
                ? result
                : mascot(
                    "shocked",
                    "Your weigh-in wasn’t saved. Please try again; no progress is lost.",
                    50,
                  ),
            );
          } finally {
            saving.current = false;
            setBusy(false);
          }
        }}
      >
        <fieldset disabled={busy} className="grid gap-4">
          <DateStepper
            value={selectedDate}
            today={data.date}
            disabled={busy}
            onChange={(date) => {
              setSelectedDate(date);
              setKgValue(
                data.weight.series.filter((w) => w.date <= date).at(-1)?.kg ??
                  data.profile.startWeightKg,
              );
              setFeedback(null);
            }}
          />
          <NumberStepper
            label={`Weight (${preferred.mass})`}
            value={massFromKg(kgValue, preferred.mass)}
            onChange={(n) => {
              setKgValue(massToKg(n, preferred.mass));
              setFeedback(null);
            }}
            min={massFromKg(20, preferred.mass)}
            max={massFromKg(500, preferred.mass)}
            step={0.1}
            suffix={preferred.mass}
            disabled={busy}
          />
          <div className="flex gap-3">
            {[-0.5, 0.5].map((n) => (
              <button
                key={n}
                type="button"
                disabled={
                  busy ||
                  massFromKg(kgValue, preferred.mass) + n < massFromKg(20, preferred.mass) ||
                  massFromKg(kgValue, preferred.mass) + n > massFromKg(500, preferred.mass)
                }
                onClick={() => {
                  setKgValue(
                    massToKg(
                      Number((massFromKg(kgValue, preferred.mass) + n).toFixed(8)),
                      preferred.mass,
                    ),
                  );
                  setFeedback(null);
                }}
                className="press min-h-11 flex-1 rounded-xl border-2 border-b-4 border-border bg-primary-soft font-bold"
              >
                {n > 0 ? "+" : ""}
                {n} {preferred.mass}
              </button>
            ))}
          </div>
          <ChunkyButton disabled={pending}>{busy ? "Saving weight…" : "Save weight"}</ChunkyButton>
        </fieldset>
      </form>
    </div>
  );
}
function PhotoForm() {
  const { data, act } = useAppData();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [urls, setUrls] = useState<Record<string, string>>({});
  return (
    <section aria-label="Private progress photos">
      {(busy || error) && (
        <MascotFeedback
          state={
            busy
              ? mascot("thinking", "Uploading your private photo…", 60)
              : mascot("shocked", "Your photo couldn’t be opened or saved. Please try again.", 50)
          }
          compact
          label="Photo action encouragement"
        />
      )}
      <form
        className="grid gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          const f = new FormData(e.currentTarget),
            file = f.get("file") as File,
            db = browserDb();
          let path = "";
          try {
            if (
              !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
              file.size > 5242880
            )
              throw new Error("Choose a JPEG, PNG or WebP up to 5 MB.");
            const {
              data: { user },
            } = await db.auth.getUser();
            if (!user) throw new Error("Please sign in again.");
            path = `${user.id}/${crypto.randomUUID()}.${file.type.split("/")[1]}`;
            const uploaded = await db.storage
              .from("progress-photos")
              .upload(path, file, { contentType: file.type, upsert: false });
            if (uploaded.error) throw new Error("Upload failed. Please try again.");
            if (
              !(await act("/api/photos", {
                date: String(f.get("date")),
                view: String(f.get("view")),
                storage_path: path,
              }))
            ) {
              await db.storage.from("progress-photos").remove([path]);
              throw new Error("Could not save photo information. Please try again.");
            }
          } catch (e) {
            setError(e instanceof Error ? e.message : "Upload failed.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Date
          <input
            type="date"
            name="date"
            className={inputClass}
            defaultValue={data.date}
            max={data.date}
            required
          />
        </label>
        <label>
          View
          <select name="view" className={inputClass}>
            <option>front</option>
            <option>side</option>
            <option>back</option>
          </select>
        </label>
        <label>
          Photo
          <input
            type="file"
            name="file"
            accept="image/jpeg,image/png,image/webp"
            className={inputClass}
            required
          />
        </label>
        {error && <p role="alert">{error}</p>}
        <ChunkyButton disabled={busy}>{busy ? "Uploading…" : "Upload private photo"}</ChunkyButton>
      </form>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {data.photos.map((p) => (
          <div key={p.id}>
            <button
              className="min-h-11 font-bold underline"
              onClick={async () => {
                try {
                  const r = await api<{ signedUrl: string }>(`/api/photos/${p.id}/url`);
                  setUrls((old) => ({ ...old, [p.id]: r.signedUrl }));
                } catch {
                  setError("Could not open photo.");
                }
              }}
            >
              {p.date} · {p.view}
            </button>
            {urls[p.id] && (
              <img
                src={urls[p.id]}
                alt={`${p.view} progress on ${p.date}`}
                className="rounded-xl"
                onError={() =>
                  setUrls((old) => {
                    const next = { ...old };
                    delete next[p.id];
                    return next;
                  })
                }
              />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
