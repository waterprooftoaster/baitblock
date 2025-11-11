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
export function initChatScraper(onNewMessage: (msg: ChatMessage) => void): void {
  const platform = getPageName();
  if (!platform) {
    console.warn("Chat scraper: Unsupported platform");
    return;
  }

  // Start observing based on platform
  if (platform === "kick") {
    findKickChatContainer((container) => {
      observeKickChat(container, onNewMessage);
    });
  }
  else if (platform === "twitch") {
    console.log("Chat scraper: Twitch scraping not implemented yet");
  }
}

/** Find the Kick chat container */
function findKickChatContainer(onFound: (container: Element) => void): void {
  const tryFind = () => {
    const container = document.getElementById("channel-chatroom");
    if (container) {
      onFound(container);
    } else {
      setTimeout(tryFind, 500); // Retry every .5 second
    }
  };
  tryFind();
}

/** Observe Kick chat for new messages */
function observeKickChat(chatContainer: Element, onNewMessage: (msg: ChatMessage) => void): void {
  const processedMessageIds = new Set<string>();

  // Extract existing messages
  extractKickMessages(chatContainer, processedMessageIds, onNewMessage);

  // Setup MutationObserver to detect new messages
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "childList") {
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
