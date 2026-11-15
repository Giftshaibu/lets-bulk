import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Home, Utensils, Dumbbell, TrendingUp, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppData } from "@/features/app-data";

const tabs = [
  { to: "/", label: "Today", icon: Home },
  { to: "/food", label: "Food", icon: Utensils },
  { to: "/train", label: "Train", icon: Dumbbell },
  { to: "/progress", label: "Progress", icon: TrendingUp },
] as const;

export function AppShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const {
    data: { profile },
  } = useAppData();

  return (
    <div className="min-h-screen bg-background pb-28 lg:pb-8">
      <div className="mx-auto flex max-w-[1040px] gap-8 px-4 lg:px-6">
        {/* Desktop side nav */}
        <aside className="sticky top-0 hidden h-screen w-[220px] shrink-0 flex-col justify-center py-8 lg:flex">
          <div className="mb-6 px-3">
            <div className="text-[20px] font-extrabold text-primary">LET’S BULK</div>
            <div className="text-[13px] font-bold text-muted-foreground">
              Week {profile.weekNumber}
              {profile.totalWeeks ? ` of ${profile.totalWeeks}` : ""}
            </div>
          </div>
          <nav className="flex flex-col gap-2">
            {tabs.map((t) => (
              <Link
                key={t.to}
                to={t.to}
                activeOptions={{ exact: t.to === "/" }}
                className="press flex items-center gap-3 rounded-2xl border-2 border-b-4 border-transparent px-4 py-3 text-[15px] font-extrabold text-ink-soft"
                activeProps={{
                  className: "!border-primary bg-primary-soft !text-primary-shadow",
                }}
              >
                <t.icon className="h-5 w-5" strokeWidth={2.6} />
                {t.label}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="w-full max-w-[720px] py-5">
          <header className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h1 className="text-[30px] leading-tight font-extrabold">{title}</h1>
              {subtitle ? (
                <p className="text-[14px] font-bold text-muted-foreground">{subtitle}</p>
              ) : null}
            </div>
            <div className="flex items-center gap-1.5 rounded-full border-2 border-b-4 border-reward bg-reward-soft px-3 py-1.5">
              <Flame className="h-5 w-5 text-reward-ink" strokeWidth={2.6} />
              <span className="text-[16px] font-extrabold text-reward-ink">
                {profile.streakDays}
              </span>
            </div>
          </header>
          <Link
            to="/settings"
            className="mb-4 inline-flex min-h-11 items-center font-bold underline"
          >
            Settings
          </Link>
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-border bg-card pb-[env(safe-area-inset-bottom)] lg:hidden">
        <div className="mx-auto grid max-w-[520px] grid-cols-4">
          {tabs.map((t) => (
            <Link
              key={t.to}
              to={t.to}
              activeOptions={{ exact: t.to === "/" }}
              className={cn(
                "flex min-h-[62px] flex-col items-center justify-center gap-1 text-[11px] font-extrabold tracking-wide text-faint uppercase",
              )}
              activeProps={{ className: "!text-primary" }}
            >
              {({ isActive }) => (
                <>
                  <t.icon
                    className={cn("h-6 w-6", isActive && "scale-110")}
                    strokeWidth={isActive ? 2.8 : 2.2}
                  />
                  {t.label}
                </>
              )}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
