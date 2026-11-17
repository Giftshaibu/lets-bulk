import { Link } from "@tanstack/react-router";
import { Settings } from "lucide-react";

export function SettingsLink() {
  return (
    <Link
      to="/settings"
      aria-label="Settings"
      title="Settings"
      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-primary-soft hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      activeProps={{ className: "bg-primary-soft text-primary" }}
    >
      <Settings className="h-5 w-5" strokeWidth={2.3} aria-hidden="true" />
    </Link>
  );
}
