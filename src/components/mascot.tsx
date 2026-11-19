import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { mascotAssets, type MascotExpression } from "@/lib/domain/mascot";
import { cn } from "@/lib/utils";

export function Mascot({
  expression,
  variant = "pose",
  className,
  interactive = false,
  hero = false,
}: {
  expression: MascotExpression;
  variant?: "face" | "pose";
  className?: string;
  interactive?: boolean;
  hero?: boolean;
}) {
  const source = mascotAssets[expression][variant];
  const [failed, setFailed] = useState<string | null>(null);
  const [quote, setQuote] = useState(""),
    [taps, setTaps] = useState(0);
  useEffect(() => {
    if (!quote) return;
    const t = setTimeout(() => setQuote(""), 2800);
    return () => clearTimeout(t);
  }, [quote, taps]);
  const art = (
    <span
      className={`mascot-art relative inline-flex shrink-0 ${hero ? "mascot-float" : ""} ${expression === "happy" ? "mascot-celebrating" : ""}`}
    >
      <img
        key={source}
        src={failed === source ? "/chiuli-icon.png" : source}
        onError={() => {
          if (failed !== source) setFailed(source);
        }}
        alt=""
        data-mascot={expression}
        width={variant === "face" ? 48 : 112}
        height={variant === "face" ? 48 : 112}
        className={cn(
          "mascot-pop shrink-0 object-contain",
          variant === "face" ? "h-10 w-10" : "h-24 w-24",
          className,
        )}
      />
    </span>
  );
  return (
    <>
      {interactive ? (
        <button
          type="button"
          aria-label="Hear encouragement from Chiuli"
          className="inline-flex shrink-0 rounded-xl focus-visible:outline-2 focus-visible:outline-primary active:scale-95"
          onClick={() => {
            const lines = [
              "One intentional action at a time.",
              "Rest, refuel, and keep showing up.",
              "Your next step counts.",
            ];
            setQuote(lines[taps % lines.length]!);
            setTaps(taps + 1);
          }}
        >
          {art}
        </button>
      ) : (
        art
      )}
      {quote &&
        createPortal(
          <div
            role="status"
            className="pointer-events-none fixed inset-x-4 bottom-24 z-[70] mx-auto max-w-sm rounded-2xl border-2 border-primary bg-card p-3 text-center text-sm font-bold shadow-lg"
          >
            {quote}
          </div>,
          document.body,
        )}
    </>
  );
}
