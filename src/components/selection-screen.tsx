import {
  Children,
  Fragment,
  isValidElement,
  useId,
  useRef,
  useState,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Check, ChevronRight, Search, X } from "lucide-react";
import { ChunkyButton } from "./kit";
export function ScreenDialog({
  title,
  open,
  onOpenChange,
  children,
  footer,
}: {
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[70] bg-black/40" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-0 z-[71] mx-auto flex h-dvh w-full max-w-2xl flex-col bg-background outline-none"
        >
          <header className="flex shrink-0 items-center justify-between gap-3 border-b-2 bg-card px-4 py-3 pt-[max(12px,env(safe-area-inset-top))]">
            <Dialog.Title className="min-w-0 text-xl font-black">{title}</Dialog.Title>
            <Dialog.Close
              aria-label="Close"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted"
            >
              <X className="h-5 w-5" />
            </Dialog.Close>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">{children}</div>
          {footer && (
            <footer className="shrink-0 border-t-2 bg-card px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">
              {footer}
            </footer>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export type PickOption = { value: string; label: string; disabled?: boolean };
export function SelectionScreen({
  title,
  options,
  value,
  onChange,
  multiple = false,
  open,
  onOpenChange,
  max = Infinity,
}: {
  title: string;
  options: PickOption[];
  value: string[];
  onChange: (values: string[]) => void;
  multiple?: boolean;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  max?: number;
}) {
  const [query, setQuery] = useState(""),
    [limit, setLimit] = useState(30);
  const filtered = options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()));
  return (
    <ScreenDialog
      title={title}
      open={open}
      onOpenChange={onOpenChange}
      footer={
        <ChunkyButton full type="button" onClick={() => onOpenChange(false)}>
          Done{multiple ? ` · ${value.length} selected` : ""}
          <Check className="h-5 w-5" />
        </ChunkyButton>
      }
    >
      <label className="mb-4 flex items-center gap-2 rounded-2xl border-2 bg-card px-3">
        <Search className="h-5 w-5 shrink-0 text-primary" />
        <input
          autoComplete="off"
          aria-label={`Search ${title.toLowerCase()}`}
          placeholder="Search choices"
          className="min-h-12 min-w-0 flex-1 bg-transparent font-bold outline-none"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setLimit(30);
          }}
        />
      </label>
      {multiple && (
        <div aria-label="Selected choices" className="mb-4 flex flex-wrap gap-2">
          {value.map((v) => (
            <button
              key={v}
              type="button"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border-2 border-primary bg-primary-soft px-3 text-sm font-bold"
              onClick={() => onChange(value.filter((x) => x !== v))}
            >
              {options.find((o) => o.value === v)?.label ?? v}
              <X className="h-4 w-4 shrink-0" />
            </button>
          ))}
        </div>
      )}
      <div className="grid gap-2">
        {filtered.slice(0, limit).map((o) => {
          const selected = value.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={selected}
              disabled={o.disabled || (!selected && value.length >= max)}
              className={`press flex min-h-16 w-full items-center gap-3 rounded-2xl border-2 border-b-4 p-4 text-left font-bold ${selected ? "border-primary-shadow bg-primary text-white" : "border-[#E3CBB5] bg-[#FFF9EE] text-[#60351F]"}`}
              onClick={() => {
                onChange(
                  multiple
                    ? selected
                      ? value.filter((v) => v !== o.value)
                      : [...value, o.value]
                    : [o.value],
                );
                if (!multiple) onOpenChange(false);
              }}
            >
              <span className="min-w-0 flex-1 break-words">{o.label}</span>
              {selected && <Check className="h-5 w-5 shrink-0" />}
            </button>
          );
        })}
        {!filtered.length && (
          <p role="status" className="p-4 font-bold">
            No matching choices.
          </p>
        )}
        {filtered.length > limit && (
          <ChunkyButton type="button" tone="neutral" onClick={() => setLimit((n) => n + 30)}>
            Show more choices
          </ChunkyButton>
        )}
      </div>
    </ScreenDialog>
  );
}
function optionText(value: ReactNode): string {
  return Children.toArray(value)
    .map((v) =>
      typeof v === "string" || typeof v === "number"
        ? String(v)
        : isValidElement<{ children?: ReactNode }>(v)
          ? optionText(v.props.children)
          : "",
    )
    .join("");
}
function collect(children: ReactNode): PickOption[] {
  return Children.toArray(children).flatMap((v) => {
    if (!isValidElement<{ children?: ReactNode; value?: string | number; disabled?: boolean }>(v))
      return [];
    if (v.type === Fragment) return collect(v.props.children);
    if (v.type !== "option") return [];
    return [
      {
        value: String(v.props.value ?? optionText(v.props.children)),
        label: optionText(v.props.children).trim(),
        disabled: !!v.props.disabled,
      },
    ];
  });
}
export function ChoiceField({
  children,
  value,
  defaultValue,
  onChange,
  name,
  required,
  disabled,
  id,
  "aria-label": ariaLabel,
  className: _className,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement>) {
  const [invalid, setInvalid] = useState(false);
  const generated = useId(),
    [own, setOwn] = useState(String(defaultValue ?? collect(children)[0]?.value ?? "")),
    [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const options = collect(children),
    current = String(value ?? own),
    label = ariaLabel ?? name?.replaceAll("_", " ") ?? "Choose an option";
  const choose = (next: string) => {
    setInvalid(false);
    setOwn(next);
    onChange?.({
      target: { value: next },
      currentTarget: { value: next },
    } as React.ChangeEvent<HTMLSelectElement>);
  };
  const list = options.filter((o) => o.value !== ""),
    long = list.length > 8;
  return (
    <div className="my-2 min-w-0" role="group" aria-label={ariaLabel}>
      <input
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        id={id ?? generated}
        name={name}
        required={required}
        disabled={disabled}
        value={current}
        onChange={() => {}}
        onInvalid={(e) => {
          e.preventDefault();
          setInvalid(true);
          button.current?.focus();
          if (long) setOpen(true);
        }}
      />
      {long ? (
        <>
          <button
            ref={button}
            type="button"
            disabled={disabled}
            aria-label={ariaLabel}
            className="press flex min-h-14 w-full items-center gap-3 rounded-2xl border-2 border-b-4 border-[#E3CBB5] bg-[#FFF9EE] p-3 text-left font-bold"
            onClick={() => setOpen(true)}
          >
            <span className="min-w-0 flex-1 break-words">
              {options.find((o) => o.value === current)?.label || label}
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-primary" />
          </button>
          <SelectionScreen
            title={label}
            options={list}
            value={[current]}
            onChange={(v) => choose(v[0] ?? "")}
            open={open}
            onOpenChange={setOpen}
          />
        </>
      ) : (
        <div className="flex flex-wrap gap-2">
          {list.map((o, i) => (
            <button
              ref={i === 0 ? button : undefined}
              type="button"
              key={o.value}
              disabled={disabled || o.disabled}
              aria-pressed={current === o.value}
              aria-label={`${label}: ${o.label}`}
              className={`press min-h-11 max-w-full rounded-xl border-2 border-b-4 px-3 py-2 text-left text-sm font-bold ${current === o.value ? "border-primary-shadow bg-primary text-white" : "border-[#E3CBB5] bg-[#FFF9EE] text-[#60351F]"}`}
              onClick={() => choose(o.value)}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
      {invalid && (
        <p role="alert" className="mt-2 text-sm font-bold text-danger">
          Choose an option to continue.
        </p>
      )}
    </div>
  );
}
