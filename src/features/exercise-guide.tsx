import { useEffect, useState } from "react";
import { ChevronRight, Pause, Play } from "lucide-react";
import { BottomSheet, InfoCard } from "@/components/bottom-sheet";
import { Mascot } from "@/components/mascot";
import { AIExplanation } from "./ai-actions";
import guidance from "@/lib/data/exercise-guidance.json";
import { useAppData } from "./app-data";
export function ExerciseGuide({ id, row = false }: { id: string; row?: boolean }) {
  const { data } = useAppData();
  const [open, setOpen] = useState(false);
  const exercise = data.exerciseLibrary.find((e) => e.id === id);
  if (!exercise) return null;
  const guide = guidance[exercise.slug as keyof typeof guidance];
  return (
    <BottomSheet
      title={exercise.name}
      open={open}
      onOpenChange={setOpen}
      trigger={
        <button
          type="button"
          className={`my-2 flex min-h-12 w-full items-center gap-3 rounded-xl border-2 border-border bg-card p-2 text-left font-bold ${row ? "" : "text-sm"}`}
        >
          {guide?.images[0] ? (
            <img
              src={guide.images[0]}
              alt=""
              loading="lazy"
              className="h-11 w-11 shrink-0 rounded-xl bg-white object-contain"
            />
          ) : (
            <Mascot expression="confident" variant="face" className="h-11 w-11" />
          )}
          <span className="min-w-0 flex-1">{row ? exercise.name : "Form guide"}</span>
          <ChevronRight className="h-5 w-5 shrink-0 text-primary" />
        </button>
      }
    >
      {open && <ExerciseDemonstration exercise={exercise} guide={guide} />}
    </BottomSheet>
  );
}
export function ExerciseDemonstration({
  exercise,
  guide,
}: {
  exercise: ReturnType<typeof useAppData>["data"]["exerciseLibrary"][number];
  guide: (typeof guidance)[keyof typeof guidance] | undefined;
}) {
  const [reduced, setReduced] = useState(true),
    [playing, setPlaying] = useState(false),
    [position, setPosition] = useState(0),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => {
      setReduced(media.matches);
      setPlaying(!media.matches);
    };
    change();
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  const images = guide?.images ?? [];
  useEffect(() => {
    if (!playing || reduced || images.length < 2) return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") setPosition((p) => (p + 1) % images.length);
    }, 1500);
    return () => clearInterval(timer);
  }, [playing, reduced, images.length]);
  const instructions =
    guide?.instructions ??
    (Array.isArray(exercise.instructions)
      ? exercise.instructions.filter((s): s is string => typeof s === "string")
      : []);
  const cues = instructions.slice(0, 3).map((s) => s.split(/(?<=[.!?])\s/)[0] ?? s);
  return (
    <section aria-label={`${exercise.name} guide`}>
      <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-2xl bg-white">
        {images.length && !failed ? (
          reduced || !playing ? (
            <div className="flex h-full w-full items-center">
              {images.map((src, i) => (
                <img
                  key={src}
                  src={src}
                  onError={() => setFailed(true)}
                  alt={`${exercise.name}: ${i === 0 ? "start" : "finish"} position`}
                  className="h-full min-w-0 flex-1 object-contain"
                  style={{ width: `${100 / images.length}%` }}
                />
              ))}
            </div>
          ) : (
            <img
              src={images[position]}
              alt={`${exercise.name}: ${position === 0 ? "start" : "finish"} position`}
              onError={() => setFailed(true)}
              className="h-full w-full object-contain"
            />
          )
        ) : (
          <Mascot expression="running" className="h-32 w-32" />
        )}
        <span className="absolute bottom-2 left-2 rounded-full bg-card/95 px-3 py-1 text-xs font-bold">
          {images.length && !failed ? "Start/end positions" : "Form cues"}
        </span>
      </div>
      {images.length > 1 && !failed && (
        <button
          type="button"
          disabled={reduced}
          onClick={() => setPlaying((p) => !p)}
          className="my-3 inline-flex min-h-11 items-center gap-2 rounded-xl border-2 border-border px-3 font-bold"
        >
          {playing && !reduced ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {reduced
            ? "Still positions · reduced motion"
            : playing
              ? "Pause positions"
              : "Play positions"}
        </button>
      )}
      <ul className="my-3 list-disc space-y-2 pl-5 font-bold">
        {cues.map((cue, i) => (
          <li key={i}>{cue}</li>
        ))}
      </ul>
      <p className="my-3 text-sm">
        Main muscle: {exercise.primary_muscle}. Equipment:{" "}
        {Array.isArray(exercise.required_equipment)
          ? exercise.required_equipment.join(", ").replaceAll("_", " ")
          : exercise.equipment}
        .
      </p>
      <InfoCard title="Full instructions & image credits">
        <ol className="my-3 list-decimal space-y-2 pl-5">
          {instructions.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
        {guide && (
          <>
            <h3 className="mt-4 font-bold">Common mistakes</h3>
            <ul className="list-disc space-y-2 pl-5">
              {guide.mistakes.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
            <p className="mt-4 text-xs">
              {guide.author} · {guide.license} · {guide.style}
              {guide.source.startsWith("https://") && (
                <>
                  {" "}
                  ·{" "}
                  <a href={guide.source} target="_blank" rel="noreferrer" className="underline">
                    Image source
                  </a>
                </>
              )}
            </p>
          </>
        )}
      </InfoCard>
      <AIExplanation kind="exercise" id={exercise.id} />
    </section>
  );
}

export function ExerciseContent({ id }: { id: string }) {
  const { data } = useAppData();
  const exercise = data.exerciseLibrary.find((e) => e.id === id);
  if (!exercise) return <p>Exercise unavailable.</p>;
  return (
    <ExerciseDemonstration
      key={id}
      exercise={exercise}
      guide={guidance[exercise.slug as keyof typeof guidance]}
    />
  );
}
export function ExerciseThumbnail({ slug, name }: { slug: string; name: string }) {
  const source = guidance[slug as keyof typeof guidance]?.images[0];
  return source ? (
    <img
      src={source}
      alt={`${name} demonstration`}
      loading="lazy"
      className="h-24 w-24 shrink-0 rounded-2xl bg-white object-contain"
    />
  ) : (
    <Mascot expression="running" className="h-24 w-24 shrink-0" />
  );
}
