// ITSUPP — service worker ΜΟΝΟ για ειδοποιήσεις.
// Δεν κρατάει ΤΙΠΟΤΑ σε cache: κάθε νέα έκδοση της εφαρμογής φαίνεται αμέσως.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; }
  catch (e) { d = { body: event.data ? event.data.text() : "" }; }
  event.waitUntil(self.registration.showNotification(d.title || "ITSUPP", {
    body: d.body || "",
    icon: "/icon-192.png",
    badge: "/badge-96.png",
    tag: d.tag || undefined,
    renotify: !!d.tag,
    lang: "el",
    data: { url: d.url || "/" }
  }));
});

// Πάτημα στην ειδοποίηση: αν η εφαρμογή είναι ήδη ανοιχτή, πάει εκεί και ανοίγει
// το σχετικό αίτημα/σημείωση· αλλιώς ανοίγει την εφαρμογή σε αυτό.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || "/", self.location.origin);
  const id = url.searchParams.get("notif");
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const w of wins) {
      if (new URL(w.url).origin !== self.location.origin) continue;
      try { await w.focus(); } catch (e) {}
      w.postMessage({ type: "open-notif", id });
      return;
    }
    await self.clients.openWindow(url.href);
  })());
});
