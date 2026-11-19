import { useState, type InputHTMLAttributes } from "react";
import { CalendarDays } from "lucide-react";
import { BottomSheet } from "./bottom-sheet";
import { DateStepper } from "./stepper";
import { getLocalDate } from "@/lib/domain/dates";
export function DateField({
  value,
  defaultValue,
  onChange,
  name,
  max,
  min,
  required,
  disabled,
  "aria-label": label = "Date",
  ...rest
}: InputHTMLAttributes<HTMLInputElement>) {
  const [own, setOwn] = useState(String(defaultValue ?? getLocalDate())),
    [open, setOpen] = useState(false);
  const date = String(value ?? own),
    today = typeof max === "string" ? max : getLocalDate();
  return (
    <div className="my-2 min-w-0">
      <input type="hidden" name={name} value={date} disabled={disabled} />
      <BottomSheet
        title={label}
        open={open}
        onOpenChange={setOpen}
        trigger={
          <button
            type="button"
            disabled={disabled}
            aria-label={label}
            className="press inline-flex min-h-11 max-w-full items-center gap-2 rounded-full border-2 border-primary/30 bg-primary/10 px-3 text-sm font-bold"
          >
            <CalendarDays className="h-4 w-4 shrink-0" />
            {date === today ? "Today" : date}
          </button>
        }
      >
        <DateStepper
          label={label}
          value={date || today}
          today={today}
          future={!max}
          onChange={(v) => {
            if (typeof min === "string" && v < min) return;
            setOwn(v);
            onChange?.({
              target: { value: v },
              currentTarget: { value: v },
            } as React.ChangeEvent<HTMLInputElement>);
          }}
        />
      </BottomSheet>
    </div>
  );
}
