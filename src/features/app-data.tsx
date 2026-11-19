import { SignOut } from "./sign-out";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { browserDb, supabaseUrl, supabaseKey } from "@/lib/db/client";
import type { Dashboard } from "@/lib/services/dashboard.service";
import { Card, ChunkyButton } from "@/components/kit";
import { SetupForm } from "./setup";
import { ChiuliIcon } from "@/components/brand";
import { useLocation } from "@tanstack/react-router";
import { Mascot } from "@/components/mascot";
import { useMascotContribution } from "./mascot-context";
import type { RewardResult } from "@/lib/domain/rewards";
export async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
  signal?: AbortSignal,
  onRewards?: (value: RewardResult) => void,
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
  const payload = (await response.json()) as {
    error?: { message?: string };
    data: unknown;
    rewards?: RewardResult;
  };
  if (!response.ok) throw new Error(payload.error?.message ?? "Request failed. Please try again.");
  if (payload.rewards) onRewards?.(payload.rewards);
  return payload.data as T;
}
type Operation = {
  path: string;
  route: string;
  status: "saving" | "success" | "error";
  message?: string;
};
type State = {
  data: Dashboard;
  act: (path: string, body?: unknown, method?: string) => Promise<boolean>;
  pending: boolean;
  operation: Operation | null;
  checkpoint: boolean;
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
  const [operation, setOperation] = useState<Operation | null>(null);
  const [checkpoint, setCheckpoint] = useState(false);
  useEffect(() => {
    if (!checkpoint) return;
    const t = setTimeout(() => setCheckpoint(false), 5000);
    return () => clearTimeout(t);
  }, [checkpoint]);
  const [rewardNotice, setRewardNotice] = useState<{
    id: string;
    points: number;
    top: number;
  } | null>(null);
  useEffect(() => {
    if (!rewardNotice) return;
    const t = setTimeout(() => setRewardNotice(null), 4500);
    return () => clearTimeout(t);
  }, [rewardNotice]);
  const route = useLocation({ select: (l) => l.pathname });
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
        if (!next) {
          setOperation(null);
          setError("");
          setRewardNotice(null);
          setCheckpoint(false);
        }
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
    setOperation({ path, route, status: "saving" });
    const wasLogged = query.data?.loggingDates.includes(query.data.date);
    const reviewId = query.data?.reviews[0]?.id;
    try {
      const origin =
        document.activeElement instanceof HTMLElement
          ? document.activeElement.getBoundingClientRect().top
          : 120;
      await api(path, method, body, undefined, (reward) => {
        if (reward.grants.some((g) => g.kind === "quests")) setCheckpoint(true);
        const points = reward.grants.reduce((sum, r) => sum + r.points, 0);
        if (points > 0)
          setRewardNotice({
            id: crypto.randomUUID(),
            points,
            top: Math.max(16, Math.min(origin, window.innerHeight - 150)),
          });
      });
      await qc.invalidateQueries({ queryKey: ["dashboard"] });
      await qc.invalidateQueries({ queryKey: ["daily-logs"] });
      const refreshed = qc.getQueryData<Dashboard>(["dashboard", session?.user.id]);
      if (
        refreshed &&
        ((!wasLogged &&
          refreshed.loggingDates.includes(refreshed.date) &&
          [3, 7, 14, 30, 60, 100].includes(refreshed.streak.current)) ||
          (path === "/api/checkins/weekly" && refreshed.reviews[0]?.id !== reviewId))
      )
        setCheckpoint(true);
      setOperation({ path, route, status: "success" });
      return true;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unable to save. Try again.";
      setError(message);
      setOperation({ path, route, status: "error", message });
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
      <Gate showIdentity={false}>
        <Mascot expression="thinking" variant="face" className="mx-auto h-12 w-12" />
        <p role="status">Loading your session…</p>
      </Gate>
    );
  if (!session) return <AuthForm />;
  if (query.isPending)
    return (
      <Gate showIdentity={false}>
        <Mascot expression="thinking" variant="face" className="mx-auto h-12 w-12" />
        <p role="status">Loading your logs…</p>
      </Gate>
    );
  if (query.isError)
    return (
      <Gate>
        <Mascot expression="shocked" className="mx-auto h-24 w-24" />
        <p role="alert">{query.error.message}</p>
        <ChunkyButton onClick={() => void query.refetch()}>Try again</ChunkyButton>
        <SignOut />
      </Gate>
    );
  if (query.data.needsOnboarding)
    return (
      <main className="mx-auto h-dvh max-w-2xl bg-background">
        {error && (
          <p role="alert">
            <Mascot
              expression="shocked"
              variant="face"
              className="mr-2 inline-block h-8 w-8 align-middle"
            />
            {error}
          </p>
        )}
        <SetupForm save={act} pending={pending} />
      </main>
    );
  return (
    <AppData.Provider value={{ data: query.data, act, pending, operation, checkpoint }}>
      <OperationContribution operation={operation} />
      {rewardNotice && (
        <div
          key={rewardNotice.id}
          role="status"
          className="xp-reward pointer-events-none fixed left-1/2 z-[70] -translate-x-1/2 rounded-full border-2 border-primary-shadow bg-primary px-5 py-3 font-black text-white shadow-lg"
          style={{ top: rewardNotice.top }}
        >
          +{rewardNotice.points} XP · Logged and banked!
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="sticky top-0 z-50 border-b-2 border-danger bg-card p-3 text-center font-bold"
        >
          <Mascot
            expression="shocked"
            variant="face"
            className="mr-2 inline-block h-8 w-8 align-middle"
          />
          {error}
          <button
            className="ml-4 underline"
            onClick={() => {
              setError("");
              setOperation(null);
            }}
          >
            Dismiss
          </button>
        </div>
      )}
      {pending && (
        <div role="status" className="fixed right-4 top-3 z-50 rounded-xl bg-card p-2 shadow">
          <Mascot
            expression="thinking"
            variant="face"
            className="mr-2 inline-block h-8 w-8 align-middle"
          />
          Saving…
        </div>
      )}
      {children}
    </AppData.Provider>
  );
}
function OperationContribution({ operation }: { operation: Operation | null }) {
  const route = useLocation({ select: (l) => l.pathname });
  useMascotContribution(
    operation?.status === "saving"
      ? { expression: "thinking", message: "Saving your action…", priority: 60 }
      : operation?.status === "error"
        ? {
            expression: "shocked",
            message: "That action couldn’t be saved. Please try again.",
            priority: 50,
          }
        : null,
    operation?.route === route,
  );
  return null;
}
function Gate({ children, showIdentity = true }: { children: ReactNode; showIdentity?: boolean }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 p-5">
      <Card>
        {showIdentity && <ChiuliIcon className="mx-auto mb-4 h-24 w-24" />}
        {children}
      </Card>
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
      <h1 className="text-center text-3xl font-black text-primary">Chiuli</h1>
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
        {busy && <Mascot expression="thinking" variant="face" className="mx-auto h-10 w-10" />}
        {error && (
          <p role="alert">
            <Mascot
              expression="shocked"
              variant="face"
              className="mr-2 inline-block h-8 w-8 align-middle"
            />
            {error}
          </p>
        )}
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
