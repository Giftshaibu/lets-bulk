import { Mascot } from "./mascot";
import type { ReactNode } from "react";
import { ChevronRight, Info, X } from "lucide-react";
import { Drawer, DrawerTrigger, DrawerContent, DrawerTitle, DrawerClose } from "./ui/drawer";

export function BottomSheet({
  title,
  trigger,
  open,
  onOpenChange,
  children,
}: {
  title: ReactNode;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
}) {
  return (
    <Drawer
      {...(open === undefined ? {} : { open })}
      {...(onOpenChange ? { onOpenChange } : {})}
      shouldScaleBackground={false}
    >
      {trigger && <DrawerTrigger asChild>{trigger}</DrawerTrigger>}
      <DrawerContent
        aria-describedby={undefined}
        className="mx-auto max-h-[92dvh] max-w-2xl rounded-t-3xl bg-card pb-[env(safe-area-inset-bottom)]"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 px-5 pt-3">
          <Mascot expression="confident" variant="face" className="h-9 w-9 shrink-0" />
          <DrawerTitle className="min-w-0 flex-1 text-xl font-black leading-tight">
            {title}
          </DrawerTitle>
          <DrawerClose
            aria-label="Close"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </DrawerClose>
        </div>
        <div data-vaul-no-drag className="overflow-y-auto overscroll-contain px-5 pt-3 pb-6">
          {children}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
export function InfoCard({
  title,
  children,
  icon,
}: {
  title: ReactNode;
  children: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <BottomSheet
      title={title}
      trigger={
        <button
          type="button"
          className="my-3 flex min-h-16 w-full items-center gap-3 rounded-2xl border-2 border-border bg-card px-[18px] py-4 text-left font-bold"
        >
          {icon ?? <Info className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />}
          <span className="min-w-0 flex-1">{title}</span>
          <ChevronRight className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        </button>
      }
    >
      {children}
    </BottomSheet>
  );
}
