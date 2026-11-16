import { useCallback, useRef, useState } from "react";
import { api } from "./app-data";
export function useAIAction<T>() {
  const [value, setValue] = useState<T | null>(null),
    [pending, setPending] = useState(false),
    [error, setError] = useState("");
  const running = useRef(false),
    epoch = useRef(0);
  const reset = useCallback(() => {
    epoch.current++;
    setValue(null);
    setError("");
  }, []);
  async function run(path: string, body: unknown) {
    if (running.current) return null;
    const version = epoch.current;
    running.current = true;
    setPending(true);
    setError("");
    try {
      const result = await api<T>(path, "POST", body, AbortSignal.timeout(20000));
      if (version !== epoch.current) return null;
      setValue(result);
      return result;
    } catch {
      if (version === epoch.current)
        setError("This helper is unavailable. Your normal app actions still work.");
      return null;
    } finally {
      running.current = false;
      setPending(false);
    }
  }
  return { value, pending, error, run, reset };
}
