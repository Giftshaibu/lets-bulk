import { buildPushPayload } from "@block65/webcrypto-web-push";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { supabaseUrl } from "../db/client";
import type { Database } from "../db/database.types";
import type { Db } from "../repositories/app.repository";
import { AppError, result } from "./errors";
export type PushEnv = {
  PUSH_ENABLED?: string;
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
};
export async function pushEnv(): Promise<PushEnv> {
  try {
    return (await import("cloudflare:workers")).env as unknown as PushEnv;
  } catch {
    return {};
  }
}
export const pushReady = (e: PushEnv) =>
  e.PUSH_ENABLED === "true" &&
  !!e.VAPID_PUBLIC_KEY &&
  !!e.VAPID_PRIVATE_KEY &&
  !!e.SUPABASE_SERVICE_ROLE_KEY;
export function validPushEndpoint(endpoint: string) {
  try {
    const u = new URL(endpoint);
    return (
      u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      !u.hash &&
      (!u.port || u.port === "443") &&
      (u.hostname === "fcm.googleapis.com" ||
        u.hostname === "updates.push.services.mozilla.com" ||
        u.hostname === "web.push.apple.com" ||
        /^[a-z0-9.-]+\.notify\.windows\.com$/.test(u.hostname)) &&
      endpoint.length <= 2048
    );
  } catch {
    return false;
  }
}
const endpoint = z.string().refine(validPushEndpoint, "Invalid push provider");
export const subscriptionSchema = z.object({
  endpoint,
  keys: z.object({
    p256dh: z.string().regex(/^[A-Za-z0-9_-]{87}=?$/),
    auth: z.string().regex(/^[A-Za-z0-9_-]{22}={0,2}$/),
  }),
});
export async function sendPush(
  subscription: z.infer<typeof subscriptionSchema>,
  payload: Record<string, string>,
  env: PushEnv,
) {
  subscriptionSchema.parse(subscription);
  const request = await buildPushPayload(
    { data: JSON.stringify(payload), options: { ttl: 600 } },
    { ...subscription, expirationTime: null },
    {
      subject: "https://giftshaibu-lets-bulk.giftshaibu.workers.dev",
      publicKey: env.VAPID_PUBLIC_KEY!,
      privateKey: env.VAPID_PRIVATE_KEY!,
    },
  );
  return (
    await fetch(subscription.endpoint, {
      ...request,
      redirect: "error",
      signal: AbortSignal.timeout(8000),
    })
  ).status;
}
export async function handlePushAction(
  db: Db,
  path: string,
  method: string,
  body: unknown,
  override?: PushEnv,
) {
  const env = override ?? (await pushEnv());
  if (path === "/api/push/config" && method === "GET")
    return { configured: pushReady(env), publicKey: env.VAPID_PUBLIC_KEY ?? null };
  if (path === "/api/push/subscription" && method === "DELETE") {
    const v = z.object({ endpoint }).parse(body);
    await result(db.rpc("remove_push_subscription", { p_endpoint: v.endpoint }));
    return { saved: true };
  }
  if (!pushReady(env))
    throw new AppError(
      "PUSH_NOT_CONFIGURED",
      "Push reminders need server configuration before they can be enabled.",
      503,
    );
  if (path === "/api/push/subscription" && method === "POST") {
    const v = subscriptionSchema.parse(body);
    await result(
      db.rpc("save_push_subscription", {
        p_endpoint: v.endpoint,
        p_p256dh: v.keys.p256dh,
        p_auth: v.keys.auth,
      }),
    );
    return { saved: true };
  }
  if (path === "/api/push/test" && method === "POST") {
    const v = z.object({ endpoint }).parse(body);
    const subscription = subscriptionSchema.parse(
      await result(db.rpc("prepare_test_push", { p_endpoint: v.endpoint })),
    );
    const status = await sendPush(
      subscription,
      {
        title: "Chiuli",
        body: "Your reminders are connected on this device.",
        tag: "chiuli-test",
        url: "/settings",
      },
      env,
    );
    if (status === 404 || status === 410)
      await result(db.rpc("remove_push_subscription", { p_endpoint: v.endpoint }));
    if (status < 200 || status >= 300)
      throw new AppError(
        "PUSH_SEND_FAILED",
        "The test notification could not be delivered. Reconnect this device and try again.",
        503,
      );
    return { sent: true };
  }
  throw new AppError("NOT_FOUND", "Endpoint not found.", 404);
}
export async function dispatchReminders(env: PushEnv) {
  if (!pushReady(env) || !supabaseUrl) return { disabled: true };
  const db = createClient<Database>(supabaseUrl, env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const claimed = await result(
    db.rpc("claim_due_reminders").abortSignal(AbortSignal.timeout(10000)),
  );
  const jobs = z
    .array(
      z.object({
        id: z.string().uuid(),
        token: z.string().uuid(),
        subscription: subscriptionSchema,
        payload: z.record(z.string()),
      }),
    )
    .parse(claimed);
  let sent = 0;
  for (const job of jobs) {
    if (!(await result(db.rpc("reminder_still_needed", { p_id: job.id, p_token: job.token }))))
      continue;
    let status = 0;
    try {
      status = await sendPush(job.subscription, job.payload, env);
    } catch {
      /* Retry only through the leased queue. */
    }
    await result(db.rpc("finish_reminder", { p_id: job.id, p_token: job.token, p_status: status }));
    if (status >= 200 && status < 300) sent++;
  }
  console.info("Reminder batch", { claimed: jobs.length, sent });
  return { claimed: jobs.length, sent };
}
