import { createContext, useContext, useEffect, useId } from "react";
import { useLocation } from "@tanstack/react-router";
import type { MascotState } from "@/lib/domain/mascot";
export type MascotEntry = MascotState & { path: string };
type Registry = {
  entries: Record<string, MascotEntry>;
  register: (id: string, entry: MascotEntry | null) => void;
};
export const MascotContext = createContext<Registry | null>(null);
export function useMascotContribution(state: MascotState | null, enabled = true) {
  const registry = useContext(MascotContext),
    register = registry?.register;
  const id = useId(),
    path = useLocation({ select: (l) => l.pathname });
  const expression = state?.expression,
    message = state?.message,
    priority = state?.priority;
  useEffect(() => {
    if (!register || !enabled || !expression || message === undefined || priority === undefined)
      return;
    register(id, { path, expression, message, priority });
    return () => register(id, null);
  }, [register, id, path, expression, message, priority, enabled]);
}
