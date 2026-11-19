import { describe, it, expect, vi, afterEach } from "vitest";
import {
  massFromKg,
  massToKg,
  volumeFromMl,
  volumeToMl,
  massText,
  manualTargets,
  units,
} from "../src/lib/domain/units";
import {
  validPushEndpoint,
  pushReady,
  sendPush,
  handlePushAction,
} from "../src/lib/services/push.service";
import { createECDH } from "node:crypto";
import type { Db } from "../src/lib/repositories/app.repository";
afterEach(() => vi.unstubAllGlobals());
describe("canonical units and manual targets", () => {
  it("round-trips mass and liquid volume without changing stored histories", () => {
    for (const kg of [20, 60.25, 100, 500])
      expect(massToKg(massFromKg(kg, "lb"), "lb")).toBeCloseTo(kg, 9);
    expect(volumeToMl(volumeFromMl(500, "fl_oz"), "fl_oz")).toBe(500);
    expect(volumeToMl(8, "fl_oz")).toBe(237);
    expect(units(null)).toEqual({ mass: "kg", volume: "ml" });
    expect(massText("40 kg × 10", "lb")).toContain("88.2 lb");
  });
  it("preserves fat and rebalances carbs, rejecting incompatible combinations", () => {
    const target = {
      calories_target: 2500,
      protein_target_g: 120,
      carbs_target_g: 330,
      fat_target_g: 65,
    };
    expect(manualTargets(target, 2700, 130)).toEqual({
      kcal: 2700,
      protein: 130,
      carbs: 370,
      fat: 65,
    });
    expect(() => manualTargets(target, 500, 500)).toThrow();
    expect(() => manualTargets(target, 2700.5, 130)).toThrow();
  });
});
describe("push safety and encrypted transport", () => {
  it("only accepts HTTPS browser push providers", () => {
    expect(validPushEndpoint("https://fcm.googleapis.com/fcm/send/abc")).toBe(true);
    for (const url of [
      "http://fcm.googleapis.com/abc",
      "https://localhost/abc",
      "https://127.0.0.1/",
      "https://fcm.googleapis.com.evil.test/",
      "https://user:pass@fcm.googleapis.com/abc",
      "https://fcm.googleapis.com:8080/abc",
    ])
      expect(validPushEndpoint(url), url).toBe(false);
  });
  it("keeps push gated until all server configuration is present", async () => {
    expect(pushReady({ PUSH_ENABLED: "true", VAPID_PUBLIC_KEY: "public" })).toBe(false);
    expect(await handlePushAction({} as Db, "/api/push/config", "GET", {}, {})).toEqual({
      configured: false,
      publicKey: null,
    });
    await expect(
      handlePushAction({} as Db, "/api/push/subscription", "POST", {}, {}),
    ).rejects.toThrow("server configuration");
  });
  it("encrypts a valid payload and never follows endpoint redirects", async () => {
    const sender = createECDH("prime256v1");
    sender.generateKeys();
    const receiver = createECDH("prime256v1");
    receiver.generateKeys();
    const fetch = vi.fn(async () => new Response(null, { status: 201 }));
    vi.stubGlobal("fetch", fetch);
    const status = await sendPush(
      {
        endpoint: "https://fcm.googleapis.com/fcm/send/fixture",
        keys: {
          p256dh: receiver.getPublicKey().toString("base64url"),
          auth: Buffer.alloc(16, 1).toString("base64url"),
        },
      },
      { title: "Chiuli", body: "A private reminder", tag: "test", url: "/" },
      {
        VAPID_PUBLIC_KEY: sender.getPublicKey().toString("base64url"),
        VAPID_PRIVATE_KEY: sender.getPrivateKey().toString("base64url"),
      },
    );
    expect(status).toBe(201);
    const options = fetch.mock.calls[0]![1] as unknown as RequestInit;
    expect(options.redirect).toBe("error");
    expect(options.signal).toBeInstanceOf(AbortSignal);
    const headers = new Headers(options.headers);
    expect(headers.get("Content-Encoding")).toBe("aes128gcm");
    expect(headers.get("Authorization")).toMatch(/^vapid /);
  });
});
