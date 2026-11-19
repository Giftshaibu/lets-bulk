import { useState } from "react";
import { mascotAssets, type MascotExpression } from "@/lib/domain/mascot";
import { cn } from "@/lib/utils";

export function Mascot({
  expression,
  variant = "pose",
  className,
}: {
  expression: MascotExpression;
  variant?: "face" | "pose";
  className?: string;
}) {
  const source = mascotAssets[expression][variant];
  const [failed, setFailed] = useState<string | null>(null);
  return (
    <img
      src={failed === source ? "/chiuli-icon.png" : source}
      onError={() => {
        if (failed !== source) setFailed(source);
      }}
      alt=""
      data-mascot={expression}
      width={variant === "face" ? 48 : 112}
      height={variant === "face" ? 48 : 112}
      className={cn(
        "shrink-0 object-contain",
        variant === "face" ? "h-10 w-10" : "h-24 w-24",
        className,
      )}
    />
  );
}
