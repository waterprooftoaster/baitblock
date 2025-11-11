// src/content/chat-scraper.ts
import { getPageName } from "./url-listener";

/** Represents a single chat message */
export interface ChatMessage {
  username: string;
  message: string;
  timestamp: number;
  platform: "kick" | "twitch";
}

/** Initialize chat scraping for the current page */
export function initChatScraper(onNewMessage: (msg: ChatMessage) => void): () => void {
  const platform = getPageName();
  if (!platform) {
    console.warn("Chat scraper: Unsupported platform");
    return () => { };
  }

  // Start observing based on platform
  if (platform === "kick") {
    return observeKickChat(onNewMessage);
  } else if (platform === "twitch") {
    return observeTwitchChat(onNewMessage);
  }
  return () => { };
}

/** Observe Kick chat for new messages */
function observeKickChat(onNewMessage: (msg: ChatMessage) => void): () => void {
  // Kick typically uses data attributes and specific class names for chat messages
  // Look for: [data-testid="chat-message"] or similar structures
  const chatContainer = findKickChatContainer();

  if (!chatContainer) {
    console.warn("Chat scraper: Could not find Kick chat container");
    return () => { };
  }

  const processedMessageIds = new Set<string>();

  // Extract existing messages
  extractKickMessages(chatContainer, processedMessageIds, onNewMessage);

  // Setup MutationObserver to detect new messages
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "childList") {
        // Check added nodes for new messages
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const messageEl = node as Element;
            const msg = parseKickMessage(messageEl);
            if (msg && !processedMessageIds.has(msg.username + msg.timestamp)) {
              processedMessageIds.add(msg.username + msg.timestamp);
              onNewMessage(msg);
            }
          }
        });
      }
    }
  });

  observer.observe(chatContainer, {
    childList: true,
    subtree: true,
    characterData: false,
    attributes: false,
  });

  return () => observer.disconnect();
}

/** Observe Twitch chat for new messages */
function observeTwitchChat(onNewMessage: (msg: ChatMessage) => void): () => void {
  // Twitch uses specific class names and structures for chat messages
  const chatContainer = findTwitchChatContainer();

  if (!chatContainer) {
    console.warn("Chat scraper: Could not find Twitch chat container");
    return () => { };
  }

  const processedMessageIds = new Set<string>();

  // Extract existing messages
  extractTwitchMessages(chatContainer, processedMessageIds, onNewMessage);

  // Setup MutationObserver to detect new messages
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "childList") {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const messageEl = node as Element;
            const msg = parseTwitchMessage(messageEl);
            if (msg && !processedMessageIds.has(msg.username + msg.timestamp)) {
              processedMessageIds.add(msg.username + msg.timestamp);
              onNewMessage(msg);
            }
          }
        });
      }
    }
  });

  observer.observe(chatContainer, {
    childList: true,
    subtree: true,
    characterData: false,
    attributes: false,
  });

  return () => observer.disconnect();
}

/** Find the Kick chat container */
function findKickChatContainer(): Element | null {
  // Kick chat is typically in a scrollable container
  // Common selectors: [class*="chat"], [class*="message"], or specific data attributes
  let container = document.querySelector('[class*="chat-message-list"]');
  if (!container) {
    container = document.querySelector('[class*="scrollable"][class*="chat"]');
  }
  if (!container) {
    // Fallback: look for any scrollable container near the video
    container = document.querySelector('[class*="chatroom"]');
  }
  return container;
}

/** Find the Twitch chat container */
function findTwitchChatContainer(): Element | null {
  // Twitch chat container is typically found with these selectors
  let container = document.querySelector('[data-test-selector="chat-scrollable-area"]');
  if (!container) {
    container = document.querySelector('[aria-label*="chat"]');
  }
  if (!container) {
    container = document.querySelector('[class*="chat-list"]');
  }
  return container;
}

/** Extract existing Kick messages from the container */
function extractKickMessages(
  container: Element,
  processedIds: Set<string>,
  onMessage: (msg: ChatMessage) => void
): void {
  const messageElements = container.querySelectorAll('[class*="message"], [data-testid*="message"]');
  messageElements.forEach((el) => {
    const msg = parseKickMessage(el);
    if (msg) {
      const id = msg.username + msg.timestamp;
      if (!processedIds.has(id)) {
        processedIds.add(id);
        onMessage(msg);
      }
    }
  });
}

/** Extract existing Twitch messages from the container */
function extractTwitchMessages(
  container: Element,
  processedIds: Set<string>,
  onMessage: (msg: ChatMessage) => void
): void {
  const messageElements = container.querySelectorAll('[data-test-selector="message"]');
  messageElements.forEach((el: Element) => {
    const msg = parseTwitchMessage(el);
    if (msg) {
      const id = msg.username + msg.timestamp;
      if (!processedIds.has(id)) {
        processedIds.add(id);
        onMessage(msg);
      }
    }
  });
}

/** Parse a Kick message element */
function parseKickMessage(element: Element): ChatMessage | null {
  try {
    // Adjust these selectors based on actual Kick DOM structure
    const usernameEl = element.querySelector('[class*="username"]') ||
      element.querySelector('[class*="author"]') ||
      element.querySelector('a[href*="/profile/"]');

    const messageEl = element.querySelector('[class*="message-content"]') ||
      element.querySelector('[class*="text"]') ||
      element.querySelector('span');

    if (!usernameEl || !messageEl) {
      return null;
    }

    const username = (usernameEl.textContent || "").trim();
    const message = (messageEl.textContent || "").trim();

    if (!username || !message) {
      return null;
    }

    return {
      username,
      message,
      timestamp: Date.now(),
      platform: "kick",
    };
  } catch {
    return null;
  }
}

/** Parse a Twitch message element */
function parseTwitchMessage(element: Element): ChatMessage | null {
  try {
    // Adjust these selectors based on actual Twitch DOM structure
    const usernameEl = element.querySelector('[data-testid="chat-message-author"]') ||
      element.querySelector('a[data-testid*="username"]') ||
      element.querySelector('span[class*="username"]');

    const messageEl = element.querySelector('[data-testid="chat-message-text"]') ||
      element.querySelector('[class*="message-body"]') ||
      element.querySelector('span[data-testid*="text"]');

    if (!usernameEl || !messageEl) {
      return null;
    }

    const username = (usernameEl.textContent || "").trim();
    const message = (messageEl.textContent || "").trim();

    if (!username || !message) {
      return null;
    }

    return {
      username,
      message,
      timestamp: Date.now(),
      platform: "twitch",
    };
  } catch {
    return null;
  }
}
