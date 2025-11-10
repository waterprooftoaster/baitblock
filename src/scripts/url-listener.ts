// src/url-listener.ts

/** Check if the url is YoutubeLive */
export function isUrlSupported(onStatus: (supported: boolean) => void) {
  return urlListener(() => {
    const supported = isYoutubeLive();
    onStatus(supported);
  });
}

/** Check if the url is YoutubeLive */
function isYoutubeLive(loc: Location = window.location): boolean {
  const u = new URL(loc.href);
  const h = u.hostname;
  const isYoutube =
    h === "www.youtube.com" ||
    h === "youtube.com" ||
    h.endsWith(".youtube.com");
  if (!isYoutube) return false;
  const p = u.pathname;
  return p === "/live" || p.startsWith("/live/");
}

/** Enable observation of url changes on a SPA */
function urlListener(onChange: () => void): () => void {
  const ROUTE_EVENT = "baitblock:urlchange";
  const emit = () => window.dispatchEvent(new Event(ROUTE_EVENT));

  // Patch history methods
  function patchHistory(method: "pushState" | "replaceState") {
    const original = history[method] as typeof history.pushState;
    (history as any)[method] = function (
      this: History,
      data: any,
      unused: string,
      url?: string | URL | null
    ) {
      const result = (original as any).call(this, data, unused, url);
      emit();
      return result;
    } as typeof original;
  }
  patchHistory("pushState");
  patchHistory("replaceState");

  // Listen to events could be url changes
  const onPop = () => emit();
  const onHash = () => emit();
  const onYt = () => emit();
  const mo = new MutationObserver(() => emit());
  const onRoute = () => onChange();
  window.addEventListener("popstate", onPop);
  window.addEventListener("hashchange", onHash);
  window.addEventListener("yt-navigate-finish" as any, onYt);
  mo.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener(ROUTE_EVENT, onRoute);

  // Initial tick
  emit();

  // Cleanup
  return () => {
    window.removeEventListener("popstate", onPop);
    window.removeEventListener("hashchange", onHash);
    window.removeEventListener("yt-navigate-finish" as any, onYt);
    window.removeEventListener(ROUTE_EVENT, onRoute);
    mo.disconnect();
  };
}
