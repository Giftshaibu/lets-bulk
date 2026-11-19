import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, Clock } from "lucide-react";
import { api } from "./app-data";
import { Card, ChunkyButton } from "@/components/kit";
function keyBytes(value: string) {
  const s = atob(value.replaceAll("-", "+").replaceAll("_", "/"));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}
export function PushSettings({
  morning,
  setMorning,
  evening,
  setEvening,
  time,
  setTime,
}: {
  morning: boolean;
  setMorning: (v: boolean) => void;
  evening: boolean;
  setEvening: (v: boolean) => void;
  time: string;
  setTime: (v: string) => void;
}) {
  const config = useQuery({
    queryKey: ["push-config"],
    queryFn: () => api<{ configured: boolean; publicKey: string | null }>("/api/push/config"),
  });
  const [supported, setSupported] = useState(false),
    [connected, setConnected] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  useEffect(() => {
    const support =
      "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setSupported(support);
    if (support)
      void navigator.serviceWorker
        .getRegistration("/")
        .then(async (r) => setConnected(!!(await r?.pushManager.getSubscription())));
  }, []);
  async function connect() {
    if (!config.data?.configured || !config.data.publicKey) return;
    setBusy(true);
    setMessage("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted")
        throw new Error(
          "Notifications are blocked. Enable them in your browser/site settings, then reconnect.",
        );
      const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      if (existing) await existing.unsubscribe();
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyBytes(config.data.publicKey),
      });
      try {
        await api("/api/push/subscription", "POST", subscription.toJSON());
      } catch (e) {
        await subscription.unsubscribe();
        throw e;
      }
      setConnected(true);
      setMessage("This device is connected. Choose your reminders and save Settings.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not connect reminders.");
    } finally {
      setBusy(false);
    }
  }
  async function test() {
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration("/");
      const sub = await registration?.pushManager.getSubscription();
      if (!sub) throw new Error("Reconnect this device first.");
      await api("/api/push/test", "POST", { endpoint: sub.endpoint });
      setMessage("Test sent. Check this device’s notifications.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Test failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card>
      <h2 className="flex items-center gap-2 text-lg font-black">
        <Bell className="h-5 w-5 text-primary" />
        Streak & reminders
      </h2>
      <p className="my-2 text-sm">
        Notifications use your profile timezone. They can arrive while Chiuli is closed on supported
        browsers.
      </p>
      {!supported && (
        <p className="my-2 text-sm font-bold">
          This browser does not support push here. On iPhone/iPad, install Chiuli on the Home Screen
          first.
        </p>
      )}
      {config.data && !config.data.configured && (
        <p className="my-2 text-sm font-bold">
          Push reminders need server configuration before they can be enabled.
        </p>
      )}
      {config.isError && <p role="alert">Could not check reminder setup. Try again.</p>}
      <p className="my-2 text-sm font-bold">
        This device: {connected ? "Connected" : "Not connected"}
      </p>
      {supported && (
        <div className="my-3 flex flex-wrap gap-2">
          <ChunkyButton
            type="button"
            size="sm"
            disabled={busy || !config.data?.configured}
            onClick={() => void connect()}
          >
            {connected ? "Reconnect device" : "Connect this device"}
          </ChunkyButton>
          <ChunkyButton
            type="button"
            tone="neutral"
            size="sm"
            disabled={busy || !connected || !config.data?.configured}
            onClick={() => void test()}
          >
            Test notification
          </ChunkyButton>
        </div>
      )}
      <label className="my-3 flex min-h-11 items-center justify-between gap-3 font-bold">
        Daily weigh-in reminder
        <input
          type="checkbox"
          role="switch"
          aria-label="Daily weigh-in reminder"
          checked={morning}
          disabled={!morning && (!connected || !config.data?.configured)}
          onChange={(e) => setMorning(e.target.checked)}
          className="h-6 w-6 accent-primary"
        />
      </label>
      <label className="flex items-center gap-2 text-sm font-bold">
        <Clock className="h-4 w-4" />
        Morning time
        <input
          aria-label="Morning reminder time (HH:mm)"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          pattern="([01][0-9]|2[0-3]):[0-5][0-9]"
          placeholder="07:00"
          className="min-h-11 w-24 rounded-xl border-2 p-2"
        />
      </label>
      <label className="my-3 flex min-h-11 items-center justify-between gap-3 font-bold">
        Evening streak alert · 8 PM
        <input
          type="checkbox"
          role="switch"
          aria-label="Evening streak alert"
          checked={evening}
          disabled={!evening && (!connected || !config.data?.configured)}
          onChange={(e) => setEvening(e.target.checked)}
          className="h-6 w-6 accent-primary"
        />
      </label>
      <p className="text-xs text-muted-foreground">
        Morning alerts stop after a weigh-in; evening alerts only send if an active streak needs a
        log. Delivery may take a few minutes. Changes take effect after Save Settings.
      </p>
      {message && (
        <p role="status" className="mt-3 text-sm font-bold">
          {message}
        </p>
      )}
    </Card>
  );
}
