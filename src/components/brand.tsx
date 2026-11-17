import { cn } from "@/lib/utils";

export function ChiuliIcon({
  className,
  decorative = true,
}: {
  className?: string;
  decorative?: boolean;
}) {
  return (
    <img
      src="/chiuli-icon.png"
      width={96}
      height={96}
      alt={decorative ? "" : "Chiuli lion"}
      className={cn("shrink-0 object-contain", className)}
    />
  );
}

export function Brand({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <ChiuliIcon className="h-11 w-11" />
      <span className="text-[25px] font-black tracking-tight text-primary">Chiuli</span>
    </span>
  );
}
