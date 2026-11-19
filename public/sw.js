self.addEventListener("push", (event) => {
  let payload;
  try {
    payload = event.data.json();
  } catch {
    return;
  }
  event.waitUntil(
    self.registration.showNotification(payload.title || "Chiuli", {
      body: payload.body,
      icon: "/chiuli-icon-192.png",
      badge: "/chiuli-icon-192.png",
      tag: payload.tag,
      renotify: false,
      data: {
        url:
          typeof payload.url === "string" &&
          payload.url.startsWith("/") &&
          !payload.url.startsWith("//")
            ? payload.url
            : "/",
      },
    }),
  );
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const url = new URL(event.notification.data?.url || "/", self.location.origin).href;
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of windows) {
        if (new URL(client.url).origin === self.location.origin) {
          await client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })(),
  );
});
