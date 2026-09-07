import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({
  children,
  className,
  tone = "default",
}: {
  children: ReactNode;
  className?: string;
  tone?: "default" | "success" | "primary" | "reward" | "info" | "special" | "danger";
}) {
  const tones: Record<string, string> = {
    default: "bg-card border-border",
    success: "bg-success-soft border-success",
    primary: "bg-primary-soft border-primary",
    reward: "bg-reward-soft border-reward",
    info: "bg-info-soft border-info",
    special: "bg-special-soft border-special",
    danger: "bg-danger-soft border-danger",
  };
  return <div className={cn("chunky p-4", tones[tone], className)}>{children}</div>;
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between">
      <h2 className="text-[13px] font-extrabold tracking-[0.12em] text-muted-foreground uppercase">
        {children}
      </h2>
      {action}
    </div>
  );
}

type ButtonTone = "primary" | "success" | "info" | "neutral" | "danger" | "special";

const buttonTones: Record<ButtonTone, string> = {
  primary: "bg-primary text-white border-primary-shadow hover:bg-primary-hover",
  success: "bg-success text-white border-success-shadow",
  info: "bg-info text-white border-info-shadow",
  danger: "bg-danger text-white border-danger-shadow",
  special: "bg-special text-special-ink border-special-shadow",
  neutral: "bg-card text-ink border-border-strong",
};

export function ChunkyButton({
  children,
  tone = "primary",
  full,
  className,
  size = "lg",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: ButtonTone;
  full?: boolean;
  size?: "sm" | "lg";
}) {
  return (
    <button
      {...props}
      className={cn(
        "press inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-b-4 font-extrabold tracking-wide uppercase disabled:opacity-50",
        size === "lg" ? "min-h-[56px] px-5 text-[15px]" : "min-h-[44px] px-4 text-[13px]",
        full && "w-full",
        buttonTones[tone],
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Bar({
  value,
  max,
  tone = "primary",
  className,
}: {
  value: number;
  max: number;
  tone?: "primary" | "success" | "info" | "reward" | "special";
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(max, 1)) * 100));
  const tones: Record<string, string> = {
    primary: "bg-primary",
    success: "bg-success",
    info: "bg-info",
    reward: "bg-reward",
    special: "bg-special",
  };
  return (
    <div className={cn("h-3.5 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div
        className={cn("h-full rounded-full transition-[width] duration-700 ease-out", tones[tone])}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function BigStat({
  value,
  label,
  suffix,
  tone = "ink",
}: {
  value: string | number;
  label: string;
  suffix?: string;
  tone?: "ink" | "primary" | "success" | "reward" | "special";
}) {
  const tones: Record<string, string> = {
    ink: "text-ink",
    primary: "text-primary",
    success: "text-success",
    reward: "text-reward-ink",
    special: "text-special-ink",
  };
  return (
    <div>
      <div className={cn("text-[30px] leading-none font-extrabold", tones[tone])}>
        {value}
        {suffix ? <span className="ml-0.5 text-[16px] font-extrabold">{suffix}</span> : null}
      </div>
      <div className="mt-1 text-[12px] font-extrabold tracking-[0.1em] text-muted-foreground uppercase">
        {label}
      </div>
    </div>
  );
}

export function Pill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "primary" | "reward" | "info" | "special";
}) {
  const tones: Record<string, string> = {
    neutral: "bg-muted text-ink-soft border-border",
    success: "bg-success-soft text-success-shadow border-success",
    primary: "bg-primary-soft text-primary-shadow border-primary",
    reward: "bg-reward-soft text-reward-ink border-reward",
    info: "bg-info-soft text-info-shadow border-info",
    special: "bg-special-soft text-special-ink border-special",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border-2 px-3 py-1 text-[12px] font-extrabold tracking-wide uppercase",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}
