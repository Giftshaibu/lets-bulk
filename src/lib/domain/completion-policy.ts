export const DEFAULT_COMPLETION_POLICY = {
  weight: true,
  nutrition: true,
  workout: true,
  recovery: true,
  water: true,
};
export type CompletionPolicy = typeof DEFAULT_COMPLETION_POLICY;
export function completionPolicy(value: unknown): CompletionPolicy {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return { ...DEFAULT_COMPLETION_POLICY };
  const v = value as Record<string, unknown>;
  if (Object.keys(DEFAULT_COMPLETION_POLICY).some((key) => typeof v[key] !== "boolean"))
    return { ...DEFAULT_COMPLETION_POLICY };
  return {
    weight: v["weight"] as boolean,
    nutrition: v["nutrition"] as boolean,
    workout: v["workout"] as boolean,
    recovery: v["recovery"] as boolean,
    water: v["water"] as boolean,
  };
}
