import guidance from "@/lib/data/exercise-guidance.json";
import { useAppData } from "./app-data";
export function ExerciseGuide({ id }: { id: string }) {
  const { data } = useAppData();
  const exercise = data.exerciseLibrary.find((e) => e.id === id);
  if (!exercise) return null;
  const guide = guidance[exercise.slug as keyof typeof guidance];
  if (!guide) return null;
  return (
    <section
      className="my-3 rounded-2xl border-2 border-border bg-card p-3"
      aria-label={`${exercise.name} guide`}
    >
      <div className="flex overflow-hidden rounded-xl bg-white">
        {guide.images.map((url, i) => (
          <img
            key={url}
            src={url}
            alt={`${exercise.name}: ${guide.images.length === 1 ? "start and finish" : i === 0 ? "start position" : "finish position"}`}
            loading="lazy"
            className="min-w-0 flex-1 object-contain"
            style={{ maxHeight: 190, width: `${100 / guide.images.length}%` }}
          />
        ))}
      </div>
      <details>
        <summary className="min-h-11 cursor-pointer py-3 font-extrabold">How do I do this?</summary>
        <p className="font-bold">Main muscle: {exercise.primary_muscle}</p>
        <p>
          Equipment:{" "}
          {Array.isArray(exercise.required_equipment)
            ? exercise.required_equipment.join(", ").replaceAll("_", " ")
            : exercise.equipment}
        </p>
        <ol className="list-decimal space-y-2 pl-5">
          {guide.instructions.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <h3 className="mt-3 font-bold">Common mistakes</h3>
        <ul className="list-disc pl-5">
          {guide.mistakes.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
        <p className="mt-3 text-xs">
          {guide.author} · {guide.license} · {guide.style}
          {guide.source.startsWith("https://") && (
            <>
              {" "}
              ·{" "}
              <a className="underline" href={guide.source} target="_blank" rel="noreferrer">
                Source
              </a>
            </>
          )}
        </p>
      </details>
    </section>
  );
}
