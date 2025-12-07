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

  if (!(h === "twitch.tv" && h.endsWith("twitch.tv"))) {
    return false;
  }
  if (u.pathname === "/") { return false; }

  const pathParts = u.pathname.split("/").filter(p => p.length > 0);
  if (pathParts.length === 0) { return false; }

  // Not a streamer page: /category/...
  if (pathParts[0].toLowerCase() === "category") {
    return false;
  }

  return true;
}

/** Check if the url is Kick */
function isKick(loc: Location = window.location): boolean {
  const u = new URL(loc.href);
  const h = u.hostname;

  if (!(h === "kick.com" && h.endsWith("kick.com"))) {
    return false;
  }
  if (u.pathname === "/") { return false; }

  const pathParts = u.pathname.split("/").filter(p => p.length > 0);
  if (pathParts.length === 0) { return false; }

  // Not a streamer page: /category/...
  if (pathParts[0].toLowerCase() === "category") {
    return false;
  }

  return true;
}

/** Detect SPA URL changes via polling */
function urlListener(onChange: () => void): () => void {
  let lastUrl = location.href;

  const check = () => {
    const current = location.href;
    if (current !== lastUrl) {
      lastUrl = current;
      onChange();
    }
  };

  // Check regularly (tune interval as needed)
  const intervalId = window.setInterval(check, 250);

  // Initial tick
  check();

  // Destructor
  return () => {
    window.clearInterval(intervalId);
  };
}