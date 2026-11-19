import { Link } from "@tanstack/react-router";
import { MascotStatus } from "./mascot-feedback";
import { Mascot } from "@/components/mascot";
import { useSharedMascot } from "./use-shared-mascot";
export function LiveBrand() {
  return (
    <div className="inline-flex shrink-0 items-center gap-2">
      <MascotStatus />
      <Link
        to="/"
        aria-label="Chiuli home"
        className="text-[25px] font-black tracking-tight text-primary"
      >
        Chiuli
      </Link>
    </div>
  );
}
export function LiveMascotIcon({ className = "" }: { className?: string }) {
  const state = useSharedMascot();
  return <Mascot expression={state.expression} variant="face" className={className} />;
}
