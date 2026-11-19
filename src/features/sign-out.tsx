import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { ChunkyButton } from "@/components/kit";
import { browserDb } from "@/lib/db/client";
import { api } from "./app-data";
export function SignOut() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const cache = useQueryClient(),
    navigate = useNavigate();
  async function leave() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if ("serviceWorker" in navigator)
        try {
          const registration = await navigator.serviceWorker.getRegistration("/");
          const subscription = await registration?.pushManager.getSubscription();
          if (subscription) {
            try {
              await api(
                "/api/push/subscription",
                "DELETE",
                { endpoint: subscription.endpoint },
                AbortSignal.timeout(5000),
              );
            } finally {
              await subscription.unsubscribe();
            }
          }
        } catch {
          /* Provider unsubscribe is best effort; never prevent signing out. */
        }
      const { error: failure } = await browserDb().auth.signOut({ scope: "local" });
      if (failure) {
        const {
          data: { session },
        } = await browserDb().auth.getSession();
        if (session) throw failure;
      }
      cache.clear();
      await navigate({ to: "/" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not sign out. Try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="my-5 rounded-3xl border-2 border-border bg-card p-4">
      <ChunkyButton type="button" full tone="neutral" disabled={busy} onClick={() => void leave()}>
        <LogOut className="h-5 w-5" />
        {busy ? "Signing out…" : "Sign out"}
      </ChunkyButton>
      {error && (
        <p role="alert" className="mt-3 text-sm font-bold">
          {error}
        </p>
      )}
    </section>
  );
}
