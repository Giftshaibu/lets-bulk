import { definePlugin } from "nitro";
import { dispatchReminders, type PushEnv } from "../lib/services/push.service";
export default definePlugin((app) => {
  app.hooks.hook("cloudflare:scheduled", async ({ env }) => {
    await dispatchReminders(env as unknown as PushEnv);
  });
});
