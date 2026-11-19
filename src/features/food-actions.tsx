import { X } from "lucide-react";
import { useState } from "react";
import * as Menu from "@radix-ui/react-dropdown-menu";
import * as Dialog from "@radix-ui/react-dialog";
import { useAppData } from "./app-data";
import { inputClass, NumberField } from "./setup";
import { ChunkyButton } from "@/components/kit";
type Food = ReturnType<typeof useAppData>["data"]["foodLibrary"][number];
export function FoodActions({ food }: { food: Food }) {
  const { act, pending } = useAppData();
  const [mode, setMode] = useState<string | null>(null);
  return (
    <>
      <Menu.Root>
        <Menu.Trigger
          aria-label={`Options for ${food.name}`}
          className="min-h-11 min-w-11 rounded-xl border-2 border-border font-extrabold"
        >
          •••
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Content className="z-50 rounded-xl border-2 border-border bg-card p-2 shadow-xl">
            {["View nutrition", ...(food.user_id ? ["Edit", "Delete"] : []), "Update price"].map(
              (item) => (
                <Menu.Item
                  key={item}
                  className="min-h-11 cursor-pointer rounded-lg px-4 py-3 font-bold outline-none focus:bg-primary-soft"
                  onSelect={() => setMode(item)}
                >
                  {item}
                </Menu.Item>
              ),
            )}
          </Menu.Content>
        </Menu.Portal>
      </Menu.Root>
      <Dialog.Root
        open={mode !== null}
        onOpenChange={(open) => {
          if (!open) setMode(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
          <Dialog.Content
            aria-describedby={undefined}
            className="fixed top-1/2 left-1/2 z-50 max-h-[85vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-2xl border-2 border-border bg-card p-5"
          >
            <Dialog.Title className="pr-11 text-xl font-extrabold">
              {mode}: {food.name}
            </Dialog.Title>
            <Dialog.Close
              aria-label="Close"
              className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-muted"
            >
              <X className="h-5 w-5" />
            </Dialog.Close>
            {mode === "View nutrition" && (
              <>
                <p>{food.preparation_state} · per 100 g</p>
                <p>
                  {food.calories_per_100g ?? "Unknown"} kcal · {food.protein_per_100g ?? "Unknown"}{" "}
                  g protein · {food.carbs_per_100g ?? "Unknown"} g carbs ·{" "}
                  {food.fat_per_100g ?? "Unknown"} g fat
                </p>
                <p>
                  {food.source} {food.source_year}
                  {food.source_license ? ` · ${food.source_license}` : ""}
                </p>
                {Number(food.alcohol_g_per_100g ?? 0) > 0 && (
                  <p>
                    Alcohol: {food.alcohol_g_per_100g} g per 100 g. Its energy is included in the
                    calories above.
                  </p>
                )}
                {food.source_reference?.startsWith("https://") ? (
                  <a
                    className="inline-flex min-h-11 items-center underline"
                    href={food.source_reference}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Source record
                  </a>
                ) : (
                  <p>{food.source_reference}</p>
                )}
              </>
            )}
            {mode === "Delete" && (
              <>
                <p>
                  Remove this custom food from your library? Your previous food logs keep their
                  saved nutrition values.
                </p>
                <ChunkyButton
                  disabled={pending}
                  onClick={async () => {
                    if (await act(`/api/foods/${food.id}`, undefined, "DELETE")) setMode(null);
                  }}
                >
                  Delete custom food
                </ChunkyButton>
              </>
            )}
            {mode === "Update price" && (
              <form
                className="grid gap-3"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  if (
                    await act("/api/prices", {
                      food_id: food.id,
                      price_mwk: Number(f.get("price")),
                      quantity: Number(f.get("grams")),
                      unit: "g",
                      place: String(f.get("place")),
                    })
                  )
                    setMode(null);
                }}
              >
                <NumberField name="price" label="Price (MWK)" min={1} max={1e8} />
                <NumberField name="grams" label="Quantity (g)" min={1} max={1e6} />
                <label>
                  Place
                  <input className={inputClass} name="place" maxLength={120} />
                </label>
                <ChunkyButton disabled={pending}>Save price</ChunkyButton>
              </form>
            )}
            {mode === "Edit" && (
              <form
                className="grid gap-3"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  if (
                    await act(
                      `/api/foods/${food.id}`,
                      {
                        name: String(f.get("name")),
                        category: food.category,
                        preparation_state: String(f.get("preparation")),
                        source_reference: String(f.get("source")),
                        calories_per_100g: Number(f.get("kcal")),
                        protein_per_100g: Number(f.get("protein")),
                        carbs_per_100g: Number(f.get("carbs")),
                        fat_per_100g: Number(f.get("fat")),
                        common_in_malawi: food.common_in_malawi ?? true,
                      },
                      "PATCH",
                    )
                  )
                    setMode(null);
                }}
              >
                <label>
                  Name
                  <input
                    className={inputClass}
                    required
                    name="name"
                    maxLength={160}
                    defaultValue={food.name}
                  />
                </label>
                <label>
                  Preparation
                  <input
                    className={inputClass}
                    required
                    name="preparation"
                    maxLength={100}
                    defaultValue={food.preparation_state}
                  />
                </label>
                {(
                  [
                    ["kcal", "Calories", food.calories_per_100g, 1000],
                    ["protein", "Protein", food.protein_per_100g, 100],
                    ["carbs", "Carbs", food.carbs_per_100g, 100],
                    ["fat", "Fat", food.fat_per_100g, 100],
                  ] as const
                ).map(([key, label, value, max]) => (
                  <NumberField
                    key={key}
                    name={key}
                    label={`${label} / 100 g`}
                    value={value ?? 0}
                    max={max}
                  />
                ))}
                <label>
                  Source or product label
                  <input
                    className={inputClass}
                    required
                    name="source"
                    maxLength={500}
                    defaultValue={food.source_reference ?? ""}
                  />
                </label>
                <ChunkyButton disabled={pending}>Save changes</ChunkyButton>
              </form>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
