export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export async function result<T>(
  query: PromiseLike<{ data: T; error: { code?: string; message: string } | null }>,
): Promise<NonNullable<T>> {
  const { data, error } = await query;
  if (error) {
    const domain = [
      "WORKOUT_ALREADY_COMPLETED",
      "WORKOUT_IN_PROGRESS",
      "EQUIPMENT_UNAVAILABLE",
      "DELOAD_ACTIVE",
      "RECOMMENDATION_ALREADY_RESOLVED",
      "INVALID_INPUT",
      "CONFLICT",
      "INVALID_TARGETS",
      "PUSH_NOT_SUBSCRIBED",
      "RATE_LIMITED",
    ];
    const code = domain.find((c) => error.message.includes(c));
    if (code)
      throw new AppError(
        code,
        code === "INVALID_TARGETS"
          ? "These targets don’t fit together. Adjust calories or protein."
          : code === "PUSH_NOT_SUBSCRIBED"
            ? "Connect a browser device before enabling reminders, or turn the reminder switches off."
            : code === "RATE_LIMITED"
              ? "Please wait a minute before sending another test notification."
              : code === "EQUIPMENT_UNAVAILABLE"
                ? "Update equipment or apply compatible exercise substitutions before starting."
                : code === "WORKOUT_IN_PROGRESS"
                  ? "Finish or end the active workout before changing your program."
                  : code === "DELOAD_ACTIVE"
                    ? "Restore the deload before changing training frequency."
                    : code === "INVALID_INPUT"
                      ? "Complete the required entries before continuing."
                      : "This action conflicts with the current saved state.",
        code === "RATE_LIMITED" ? 429 : code === "INVALID_TARGETS" ? 400 : 409,
      );
    if (error.code === "23505") throw new AppError("CONFLICT", "This entry already exists.", 409);
    if (error.code === "P0002" || error.code === "PGRST116")
      throw new AppError("NOT_FOUND", "The requested entry was not found.", 404);
    if (error.code === "42501")
      throw new AppError("FORBIDDEN", "You do not have access to this entry.", 403);
    console.error("Database operation failed", error.code);
    throw new AppError("DATABASE_ERROR", "Could not save or load data. Please try again.", 500);
  }
  return data as NonNullable<T>;
}
