import { outputs, type Task, type Output } from "./schemas";
import { AIError, type Facts } from "./types";
const numberWords: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  half: 0.5,
  quarter: 0.25,
};
export function containsPrivateCredentials(text: string) {
  return /\bBearer\s+\S+|\bsb_(?:secret|publishable)_[\w-]+|postgres(?:ql)?:\/\/|\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(
    text,
  );
}
function wordsAsNumbers(text: string) {
  return (
    text
      .toLowerCase()
      .match(
        /\b(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|half|quarter)\b/g,
      ) ?? []
  ).map((w) => numberWords[w]!);
}
function numbers(text: string) {
  return [...text.matchAll(/-?\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));
}
function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === "object")
    return Object.entries(value)
      .filter(([key]) => !/(?:^id$|ids$|candidateId|foodId)/i.test(key))
      .flatMap(([, v]) => strings(v));
  return [];
}
function factsNumbers(value: unknown): number[] {
  if (typeof value === "number") return [value];
  if (typeof value === "string") return [...numbers(value), ...wordsAsNumbers(value)];
  if (Array.isArray(value)) return value.flatMap(factsNumbers);
  if (value && typeof value === "object")
    return Object.entries(value)
      .filter(([key]) => !/(?:^id$|ids$|candidateId|foodId)/i.test(key))
      .flatMap(([, v]) => factsNumbers(v));
  return [];
}
export function canonical(value: unknown): string {
  return JSON.stringify(value, (_, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)))
      : v,
  );
}
export async function contextHash(value: unknown) {
  return [
    ...new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical(value))),
    ),
  ]
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("");
}
export function validateOutput<T extends Task>(task: T, raw: unknown, facts: Facts): Output<T> {
  const parsed = outputs[task].safeParse(raw);
  if (!parsed.success) throw new AIError("AI_INVALID_RESPONSE");
  if (task === "parseFoodLog") {
    const data = parsed.data as Output<"parseFoodLog">;
    const text = String(facts["text"] ?? "");
    for (const item of data.items) {
      if (!text.includes(item.sourceText)) throw new AIError("AI_OUTPUT_REJECTED");
      if (item.quantity !== null) {
        const numeric = numbers(item.sourceText);
        const words =
          item.sourceText
            .toLowerCase()
            .match(
              /\b(?:a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|half|quarter)\b/g,
            ) ?? [];
        const evidence = [...numeric, ...words.map((w) => numberWords[w]!)];
        if (evidence.length !== 1 || Math.abs(evidence[0]! - item.quantity) > 0.000001) {
          item.quantity = null;
          item.unit = null;
          data.clarificationNeeded = true;
        }
      }
      if (item.quantity === null || item.unit === null) data.clarificationNeeded = true;
    }
    if (data.clarificationNeeded && !data.clarificationQuestion)
      data.clarificationQuestion =
        "Please confirm the foods, preparation and amounts before logging.";
    return data as Output<T>;
  }
  const prose = strings(parsed.data).join(" ");
  if (/\b(diagnos\w*|prescrib\w*|cure\w*|guarantee\w*|steroids?|insulin)\b/i.test(prose))
    throw new AIError("AI_OUTPUT_REJECTED");
  const allowed = new Set(
    factsNumbers(facts).flatMap((n) => [
      String(n),
      String(Math.round(n)),
      String(Number(n.toFixed(1))),
    ]),
  );
  if ([...numbers(prose), ...wordsAsNumbers(prose)].some((n) => !allowed.has(String(n))))
    throw new AIError("AI_OUTPUT_REJECTED");
  if (task === "explainRecommendation") {
    const value = parsed.data as Output<"explainRecommendation">;
    if (value.decision !== facts["decision"]) throw new AIError("AI_OUTPUT_REJECTED");
    const current = facts["currentValue"],
      next = facts["recommendedValue"];
    if (
      typeof current === "number" &&
      typeof next === "number" &&
      ((next > current && /\b(reduce|decrease|lower)\b/i.test(prose)) ||
        (next < current && /\b(increase|raise|add)\b/i.test(prose)))
    )
      throw new AIError("AI_OUTPUT_REJECTED");
  }
  if (task === "suggestMeals") {
    const candidates = facts["candidates"] as { id: string; foodIds: string[] }[];
    const value = parsed.data as Output<"suggestMeals">;
    const seen = new Set<string>();
    for (const s of value.suggestions) {
      const candidate = candidates.find((c) => c.id === s.candidateId);
      if (
        !candidate ||
        seen.has(s.candidateId) ||
        canonical([...s.foodIds].sort()) !== canonical([...candidate.foodIds].sort())
      )
        throw new AIError("AI_OUTPUT_REJECTED");
      seen.add(s.candidateId);
    }
  }
  return parsed.data as Output<T>;
}
