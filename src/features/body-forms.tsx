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
export function BodyForms() {
  const { data, act, pending } = useAppData();
  return (
    <Card>
      <SectionTitle>Log your progress</SectionTitle>
      <div className="grid gap-4">
        <form
          className="grid gap-3 sm:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            void act("/api/weight", { date: String(f.get("date")), weight_kg: num(f, "weight") });
          }}
        >
          <label className="text-sm font-bold">
            Date
            <input
              type="date"
              name="date"
              defaultValue={data.date}
              max={data.date}
              required
              className={inputClass}
            />
          </label>
          <NumberField name="weight" label="Weight (kg)" min={20} max={500} />
          <ChunkyButton disabled={pending}>Save weight</ChunkyButton>
        </form>
        <details>
          <summary className="min-h-11 cursor-pointer font-bold">Body measurements</summary>
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
        </details>
        <PhotoForm />
      </div>
    </Card>
  );
}
function PhotoForm() {
  const { data, act } = useAppData();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [urls, setUrls] = useState<Record<string, string>>({});
  return (
    <details>
      <summary className="min-h-11 cursor-pointer font-bold">Private progress photos</summary>
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
    </details>
  );
}
