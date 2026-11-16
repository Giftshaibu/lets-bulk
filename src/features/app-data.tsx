import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { browserDb, supabaseUrl, supabaseKey } from "@/lib/db/client";
import type { Dashboard } from "@/lib/services/dashboard.service";
import { Card, ChunkyButton } from "@/components/kit";
import { SetupForm } from "./setup";
export async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const {
    data: { session },
  } = await browserDb().auth.getSession();
  const response = await fetch(path, {
    method,
    ...(signal ? { signal } : {}),
    headers: {
      Authorization: `Bearer ${session?.access_token ?? ""}`,
      "Content-Type": "application/json",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const payload = (await response.json()) as { error?: { message?: string }; data: unknown };
  if (!response.ok) throw new Error(payload.error?.message ?? "Request failed. Please try again.");
  return payload.data as T;
}
type State = {
  data: Dashboard;
  act: (path: string, body?: unknown, method?: string) => Promise<boolean>;
  pending: boolean;
};
const AppData = createContext<State | null>(null);
export const useAppData = () => {
  const value = useContext(AppData);
  if (!value) throw new Error("App data unavailable");
  return value;
};
export function DataProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null),
    [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [pending, setPending] = useState(false);
  const qc = useQueryClient();
  const saving = useRef(false);
  useEffect(() => {
    if (!supabaseUrl || !supabaseKey) return;
    let mounted = true;
    const db = browserDb();
    void db.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session);
        setReady(true);
      }
    });
    const {
      data: { subscription },
    } = db.auth.onAuthStateChange((_event, next) => {
      if (mounted) {
        setSession(next);
        setReady(true);
        if (!next) qc.clear();
      }
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [qc]);
  const query = useQuery({
    queryKey: ["dashboard", session?.user.id],
    queryFn: () => api<Dashboard>("/api/dashboard"),
    enabled: ready && !!session,
    retry: 1,
    refetchOnWindowFocus: true,
    refetchInterval: 60000,
  });
  async function act(path: string, body?: unknown, method = "POST") {
    if (saving.current) return false;
    saving.current = true;
    setPending(true);
    setError("");
    try {
      await api(path, method, body);
      await qc.invalidateQueries({ queryKey: ["dashboard"] });
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save. Try again.");
      return false;
    } finally {
      saving.current = false;
      setPending(false);
    }
  }
  if (!supabaseUrl || !supabaseKey)
    return (
      <Gate>
        <h1 className="text-xl font-extrabold">Connect your database</h1>
        <p>Set the Supabase URL and publishable key using .env.example, then restart the app.</p>
      </Gate>
    );
  if (!ready)
    return (
      <Gate>
        <p role="status">Loading your session…</p>
      </Gate>
    );
  if (!session) return <AuthForm />;
  if (query.isPending)
    return (
      <Gate>
        <p role="status">Loading your logs…</p>
      </Gate>
    );
  if (query.isError)
    return (
      <Gate>
        <p role="alert">{query.error.message}</p>
        <ChunkyButton onClick={() => void query.refetch()}>Try again</ChunkyButton>
        <button onClick={() => void browserDb().auth.signOut()}>Sign out</button>
      </Gate>
    );
  if (query.data.needsOnboarding)
    return (
      <Gate>
        {error && <p role="alert">{error}</p>}
        <SetupForm save={act} pending={pending} />
      </Gate>
    );
  return (
    <AppData.Provider value={{ data: query.data, act, pending }}>
      {error && (
        <div
          role="alert"
          className="sticky top-0 z-50 border-b-2 border-danger bg-card p-3 text-center font-bold"
        >
          {error}
          <button className="ml-4 underline" onClick={() => setError("")}>
            Dismiss
          </button>
        </div>
      )}
      {pending && (
        <div role="status" className="fixed right-4 top-3 z-50 rounded-xl bg-card p-2 shadow">
          Saving…
        </div>
      )}
      {children}
    </AppData.Provider>
  );
}
function Gate({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 p-5">
      <Card>{children}</Card>
    </main>
  );
}
function AuthForm() {
  const [signup, setSignup] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  return (
    <Gate>
      <h1 className="text-2xl font-extrabold">LET’S BULK</h1>
      <p className="my-3 font-bold">
        {signup ? "Create your private account" : "Sign in to your training companion"}
      </p>
      <form
        className="grid gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          setMessage("");
          const form = new FormData(e.currentTarget),
            email = String(form.get("email")),
            password = String(form.get("password"));
          try {
            const result = signup
              ? await browserDb().auth.signUp({ email, password })
              : await browserDb().auth.signInWithPassword({ email, password });
            if (result.error)
              setError(
                signup
                  ? "Could not create account. Check your details and try again."
                  : "Sign-in failed. Check your email and password.",
              );
            else if (signup && !result.data.session)
              setMessage("Check your email to confirm your account, then sign in.");
          } catch {
            setError("Could not connect. Please try again.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Email
          <input
            className="mt-1 min-h-12 w-full rounded-xl border-2 p-3"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </label>
        <label>
          Password
          <input
            className="mt-1 min-h-12 w-full rounded-xl border-2 p-3"
            name="password"
            type="password"
            autoComplete={signup ? "new-password" : "current-password"}
            minLength={8}
            required
          />
        </label>
        {error && <p role="alert">{error}</p>}
        {message && <p role="status">{message}</p>}
        <ChunkyButton disabled={busy}>
          {busy ? "Please wait…" : signup ? "Create account" : "Sign in"}
        </ChunkyButton>
        <button
          type="button"
          className="min-h-11 underline"
          onClick={() => {
            setSignup(!signup);
            setError("");
          }}
        >
          {signup ? "Already have an account? Sign in" : "Create an account"}
        </button>
      </form>
    </Gate>
  );
}
