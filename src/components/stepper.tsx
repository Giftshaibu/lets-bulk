import { useEffect, useId, useRef, useState } from "react";
import { Minus, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { addDays } from "@/lib/domain/dates";

function StepButton({
  direction,
  label,
  disabled,
  step,
  date = false,
}: {
  direction: -1 | 1;
  label: string;
  disabled: boolean;
  step: () => void;
  date?: boolean;
}) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    repeat = useRef<ReturnType<typeof setInterval> | null>(null),
    pointer = useRef(false);
  const latest = useRef(step);
  latest.current = step;
  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    if (repeat.current) clearInterval(repeat.current);
    timer.current = null;
    repeat.current = null;
  };
  useEffect(() => {
    const blur = () => {
      stop();
      pointer.current = false;
    };
    window.addEventListener("blur", blur);
    return () => {
      stop();
      window.removeEventListener("blur", blur);
    };
  }, []);
  useEffect(() => {
    if (disabled) stop();
  }, [disabled]);
  const Icon = date ? (direction < 0 ? ChevronLeft : ChevronRight) : direction < 0 ? Minus : Plus;
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onPointerDown={(e) => {
        if (disabled || e.button !== 0) return;
        pointer.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        latest.current();
        timer.current = setTimeout(() => {
          repeat.current = setInterval(() => latest.current(), 100);
        }, 400);
      }}
      onPointerUp={stop}
      onPointerCancel={() => {
        stop();
        pointer.current = false;
      }}
      onLostPointerCapture={stop}
      onClick={() => {
        if (pointer.current) {
          pointer.current = false;
          return;
        }
        latest.current();
      }}
      className={`press flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 border-b-4 text-white disabled:border-[#D1D5DB] disabled:bg-[#E5E7EB] disabled:text-muted-foreground min-[360px]:h-14 min-[360px]:w-14 ${direction < 0 ? "border-[#3E2011] bg-[#60351F]" : "border-[#CC7000] bg-[#FF9600]"}`}
    >
      <Icon className="h-6 w-6" strokeWidth={3.5} aria-hidden="true" />
    </button>
  );
}
export function NumberStepper({
  label,
  value,
  onChange,
  step,
  min,
  max,
  suffix = "",
  disabled = false,
  name,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  step: number;
  min: number;
  max: number;
  suffix?: string;
  disabled?: boolean;
  name?: string;
}) {
  const id = useId(),
    [editing, setEditing] = useState(false),
    [draft, setDraft] = useState(""),
    [error, setError] = useState("");
  const current = useRef(value);
  current.current = value;
  const adjust = (d: number) => {
    const n = Number((current.current + d * step).toFixed(8));
    if (n < min || n > max || disabled) return;
    current.current = n;
    setError("");
    onChange(n);
  };
  const commit = () => {
    const n = Number(draft);
    if (!draft.trim() || !Number.isFinite(n) || n < min || n > max) {
      setError(`Enter a value from ${Number(min.toFixed(2))} to ${Number(max.toFixed(2))}.`);
      return;
    }
    onChange(n);
    setEditing(false);
    setError("");
  };
  return (
    <div className="min-w-0" role="group" aria-labelledby={id}>
      <p id={id} className="mb-2 text-sm font-extrabold">
        {label}
      </p>
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
        <StepButton
          direction={-1}
          label={`Decrease ${label}`}
          disabled={disabled || value - step < min - 1e-8}
          step={() => adjust(-1)}
        />
        {editing ? (
          <input
            autoFocus
            type="number"
            min={min}
            max={max}
            step="any"
            required
            aria-label={label}
            inputMode="decimal"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commit();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                setEditing(false);
                setError("");
              }
            }}
            className="h-[68px] min-w-0 w-full rounded-2xl border-2 border-[#E5D9C5] bg-[#FFF9EE] p-2 text-center text-xl font-black"
          />
        ) : (
          <button
            type="button"
            aria-label={`Edit ${label}`}
            disabled={disabled}
            onClick={() => {
              setDraft(String(Number(value.toFixed(4))));
              setEditing(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                e.preventDefault();
                adjust(e.key === "ArrowUp" ? 1 : -1);
              }
            }}
            className="h-[68px] min-w-0 rounded-2xl border-2 border-[#E5D9C5] bg-[#FFF9EE] px-1 text-center text-xl font-black text-[#25201F]"
          >
            {value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            <span className="ml-1 text-sm">{suffix}</span>
          </button>
        )}
        <StepButton
          direction={1}
          label={`Increase ${label}`}
          disabled={disabled || value + step > max + 1e-8}
          step={() => adjust(1)}
        />
      </div>
      {name && <input type="hidden" name={name} value={value} />}
      {error && (
        <p role="alert" className="mt-1 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
export function DateStepper({
  value,
  onChange,
  today,
  disabled = false,
  label = "Date",
  name = "date",
  future = false,
}: {
  value: string;
  onChange: (date: string) => void;
  today: string;
  disabled?: boolean;
  label?: string;
  name?: string;
  future?: boolean;
}) {
  const [editing, setEditing] = useState(false),
    [draft, setDraft] = useState(""),
    [error, setError] = useState("");
  const current = useRef(value);
  current.current = value;
  const valid = (d: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(d) &&
    d >= "1900-01-01" &&
    (future || d <= today) &&
    !isNaN(Date.parse(d)) &&
    new Date(`${d}T12:00:00Z`).toISOString().slice(0, 10) === d;
  const adjust = (d: number) => {
    if (disabled) return;
    const n = addDays(current.current, d);
    if (valid(n)) {
      current.current = n;
      onChange(n);
    }
  };
  const commit = () => {
    if (!valid(draft)) {
      setError(future ? "Use a valid YYYY-MM-DD date." : "Use YYYY-MM-DD, up to today.");
      return;
    }
    onChange(draft);
    setEditing(false);
    setError("");
  };
  return (
    <div className="min-w-0" role="group" aria-label={label}>
      <p className="mb-2 text-sm font-extrabold">{label}</p>
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
        <StepButton
          date
          direction={-1}
          label={`Previous ${label.toLowerCase()}`}
          disabled={disabled || value <= "1900-01-01"}
          step={() => adjust(-1)}
        />
        {editing ? (
          <input
            autoFocus
            required
            pattern="[0-9]{4}-[0-9]{2}-[0-9]{2}"
            aria-label={`${label} (YYYY-MM-DD)`}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              e.currentTarget.setCustomValidity(
                valid(e.target.value) ? "" : "Choose a valid date within the allowed range.",
              );
            }}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commit();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                setEditing(false);
              }
            }}
            className="h-[68px] min-w-0 w-full rounded-2xl border-2 border-[#E5D9C5] bg-[#FFF9EE] p-1 text-center font-bold"
          />
        ) : (
          <button
            type="button"
            disabled={disabled}
            aria-label={`Edit ${label}`}
            onClick={() => {
              setDraft(value);
              setEditing(true);
            }}
            className="h-[68px] min-w-0 rounded-2xl border-2 border-[#E5D9C5] bg-[#FFF9EE] px-1 text-sm font-black"
          >
            {value === today ? "Today · " : value === addDays(today, -1) ? "Yesterday · " : ""}
            {new Date(`${value}T12:00:00Z`).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: value.slice(0, 4) !== today.slice(0, 4) ? "numeric" : undefined,
              timeZone: "UTC",
            })}
          </button>
        )}
        <StepButton
          date
          direction={1}
          label={`Next ${label.toLowerCase()}`}
          disabled={disabled || (!future && value >= today)}
          step={() => adjust(1)}
        />
      </div>
      <input type="hidden" name={name} value={value} />
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
export function RatingChips({
  label,
  value,
  onChange,
  name,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  name?: string;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-extrabold">{label}</legend>
      <div className="flex gap-2" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={n === value}
            onClick={() => onChange(n)}
            className={`press h-11 min-w-0 flex-1 rounded-xl border-2 border-b-4 font-black ${n === value ? "border-primary-shadow bg-primary text-white" : "border-border bg-card"}`}
          >
            {n}
          </button>
        ))}
      </div>
      {name && <input type="hidden" name={name} value={value} />}
    </fieldset>
  );
}
