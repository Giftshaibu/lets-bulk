import { it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import guidance from "../src/lib/data/exercise-guidance.json";
it("provides local licensed visuals and steps for every active reference exercise", () => {
  expect(Object.keys(guidance)).toHaveLength(48);
  for (const exercise of Object.values(guidance)) {
    expect(exercise.instructions.length).toBeGreaterThan(0);
    expect(["Unlicense", "CC0-1.0"]).toContain(exercise.license);
    expect(exercise.author.length).toBeGreaterThan(0);
    for (const image of exercise.images) {
      expect(image.startsWith("/exercises/")).toBe(true);
      expect(existsSync(`public${image}`)).toBe(true);
      const bytes = readFileSync(`public${image}`);
      expect(bytes.length).toBeGreaterThan(300);
      if (image.endsWith(".jpg")) expect([...bytes.subarray(0, 2)]).toEqual([255, 216]);
      else expect(bytes.toString()).toContain("<svg");
    }
  }
});
