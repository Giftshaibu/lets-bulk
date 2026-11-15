export const clamp = (n: number, min = 0, max = 1) => Math.max(min, Math.min(max, n));
export const average = (ns: number[]) =>
  ns.length ? ns.reduce((a, n) => a + n, 0) / ns.length : null;
export const round = (n: number, digits = 1) => Number(n.toFixed(digits));
