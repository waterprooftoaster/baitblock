// src/url-listener.ts

/** Init function to check if page is supported */
export function isValidPage(onName: (supported: string) => void) {
  return urlListener(() => {
    const streamName = getStreamName();
    if (streamName) { onName(streamName); }
  });
}

/* Get stream name, called by scraping workflow as well*/
export function getStreamName(): string | null {
  const twitchStreamName = isTwitch();
  const KickStreamName = isKick();
  if (KickStreamName) { return KickStreamName; }
  else if (twitchStreamName) { return twitchStreamName; }
  return null;
}

/** Detect SPA URL changes via polling */
function urlListener(onChange: () => void): () => void {
  let lastUrl = location.href;

  // Polling function
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

/** Check if the url is Twitch and return stream name if it is */
function isTwitch(loc: Location = window.location): string | null {
  const u = new URL(loc.href);
  const h = u.hostname;

  // Twitch domain check
  if (!(h === "twitch.tv" && h.endsWith("twitch.tv"))) {
    return null;
  }
  if (u.pathname === "/") { return null; }

  // Get stream name
  const pathParts = u.pathname.split("/").filter(p => p.length > 0);
  const streamName = pathParts[0].toLowerCase();
  if (pathParts.length === 0) { return null; }

  // Not a streamer page: /category/...
  if (streamName === "category") {
    return null;
  }

  return streamName;
}

/** Check if the url is Kick return stream name if it is */
function isKick(loc: Location = window.location): string | null {
  const u = new URL(loc.href);
  const h = u.hostname;

  // Kick domain check
  if (!(h === "kick.com" && h.endsWith("kick.com"))) {
    return null;
  }
  if (u.pathname === "/") { return null; }

  // Get stream name
  const pathParts = u.pathname.split("/").filter(p => p.length > 0);
  const streamName = pathParts[0].toLowerCase();
  if (streamName.length === 0) { return null; }

  // Not a streamer page: /category/...
  if (pathParts[0].toLowerCase() === "category") {
    return null;
  }

  return streamName;
}