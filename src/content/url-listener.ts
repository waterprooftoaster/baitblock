// src/url-listener.ts

/** Init function to check if page is supported */
export function isPageSupported(onStatus: (supported: boolean) => void) {
  return urlListener(() => {
    const supported = !(getPageName() === null);
    onStatus(supported);
  });;
}

/** Get page name */
export function getPageName(): "kick" | "twitch" | null {
  if (isTwitch()) { return "twitch"; }
  if (isKick()) { return "kick"; }
  return null;
}

/** Check if the url is Twitch */
function isTwitch(loc: Location = window.location): boolean {
  const u = new URL(loc.href);
  const h = u.hostname;
  if (
    !(h === "www.twitch.tv" &&
      (h.endsWith("twitch.tv")))
  ) {
    return false;
  }
  if (u.pathname === "/") { return false; }
  // Check if there's a streamer name after the first /
  const pathParts = u.pathname.split("/").filter(p => p.length > 0);
  if (pathParts.length === 0) { return false; }
  return true;
}

/** Check if the url is Kick */
function isKick(loc: Location = window.location): boolean {
  const u = new URL(loc.href);
  const h = u.hostname;
  if (
    !(h === "kick.com" &&
      (h.endsWith("kick.com")))
  ) {
    return false;
  }
  if (u.pathname === "/") { return false; }
  // Check if there's a streamer name after the first /
  const pathParts = u.pathname.split("/").filter(p => p.length > 0);
  if (pathParts.length === 0) { return false; }
  return true;
}

/** Detect SPA URL changes */
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
  // const mo = new MutationObserver(() => emit());
  window.addEventListener("popstate", onPop);
  window.addEventListener("hashchange", onHash);
  window.addEventListener("yt-navigate-finish" as any, onYt);
  // mo.observe(document.documentElement, { childList: true, subtree: true });

  // Listen to our custom event that fires when url changes
  const onRoute = () => onChange();
  window.addEventListener(ROUTE_EVENT, onRoute);

  // Initial tick
  emit();

  // Destructor
  return () => {
    window.removeEventListener("popstate", onPop);
    window.removeEventListener("hashchange", onHash);
    window.removeEventListener("yt-navigate-finish" as any, onYt);
    window.removeEventListener(ROUTE_EVENT, onRoute);
    // mo.disconnect();
  };
}
