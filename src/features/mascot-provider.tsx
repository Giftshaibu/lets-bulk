import { useCallback, useState, type ReactNode } from "react";
import { MascotContext, type MascotEntry } from "./mascot-context";
export function MascotProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<Record<string, MascotEntry>>({});
  const register = useCallback((id: string, entry: MascotEntry | null) => {
    setEntries((old) => {
      const next = { ...old };
      if (entry) next[id] = entry;
      else delete next[id];
      return next;
    });
  }, []);
  return <MascotContext.Provider value={{ entries, register }}>{children}</MascotContext.Provider>;
}
