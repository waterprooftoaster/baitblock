// src/content/chat-scraper.ts
import { getStreamName } from "./url-listener";

/** Represents a single chat message */
interface ChatMessage {
  streamName?: string;
  username?: string;
  text?: string;
  emoteId?: string;
}

/** Initialize chat scraping for the current page */
export function chatScraper(onNewMessage: (msg: ChatMessage) => void): void {
  const streamName = getStreamName();
  if (!streamName) {
    console.warn("scrape-kick: unsupported platform");
    return;
  }
  else {
    console.log("scrape-kick: calling observeKickChat");
    observeKickChat(onNewMessage);
  }
}

/** Observe Kick chat for new messages */
function observeKickChat(onNewMessage: (msg: ChatMessage) => void): void {
  // Find chat container
  // Async promise because we cannot begin without finding the container div
  const tryFind = (): Promise<Element | null> => {
    let count = 0;
    const container = document.getElementById("chatroom-messages");
    if (container) {
      console.log("scrape-kick: found Kick chat container");
      return Promise.resolve(container);
    } else if (count < 20) {
      count++;
      return new Promise((resolve) => {
        setTimeout(() => resolve(tryFind()), 500);
      });
    }
    console.warn("scrape-kick: unable to find Kick chat container");
    return Promise.resolve(null);
  };

  // Setup MutationObserver only after we find the container
  tryFind().then((chatContainer) => {
    if (!chatContainer) { return; }
    const seenMessages = new Set<string>();

    // Get existing messages
    getExistingMessages(chatContainer).forEach((msg) => { onNewMessage(msg); });

    // Setup MutationObserver to detect new messages
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach((node) => {

            // Safety checks to see if node is valid and a message 
            if (node.nodeType !== Node.ELEMENT_NODE) { return; }
            const element = node as Element;
            if (!element.hasAttribute("data-index")) {
              console.log("scrape-kick: skipped non-message element");
              return;
            }

            // Save seen ids to avoid dupes
            const id = element.getAttribute("data-index");
            if (!id || seenMessages.has(id)) { return; }
            seenMessages.add(id);

            // Callback with parsed message
            const parsedMessage = parseMessage(element, id);
            if (parsedMessage) { onNewMessage(parsedMessage); }
          });
        }
      }
    });

    // Use observer
    observer.observe(chatContainer, {
      childList: true,
      subtree: true
    });
  });
}

/** Get all existing messages: */
function getExistingMessages(chatContainer: Element): ChatMessage[] {
  if (!chatContainer) { return []; }
  const messages: ChatMessage[] = [];

  // Iterate through existing messages
  const messageElements = chatContainer.children[0].children;
  for (const element of messageElements) {
    const id = element.getAttribute("data-index");
    const parsedMessage = parseMessage(element, id);
    if (parsedMessage) {
      messages.push(parsedMessage);
    }
  }

  return messages;
}

/** Parse a Kick message element */
function parseMessage(root: Element, id: string | null): ChatMessage | null {
  // Helper to parse message body
  const parseMessageBody = (messageBody: HTMLCollection, id: string | null): ChatMessage | null => {
    try {
      if (messageBody.length !== 4) {
        console.log(`scrape-kick: likely not an actual message: ${id}`);
        return null;
      }

      // 1. Username
      let username: string | null = null;
      const userEl = messageBody[1];
      for (const child of userEl.children) {
        if (child.nodeName === 'BUTTON') {
          username = child.textContent?.trim() || null;
        }
      }

      // 2. Message Content
      let emoteId: string | null = null;
      let text: string | null = null;
      const contentEl = messageBody[3];
      for (const child of contentEl.children) {
        if (child.nodeName === 'SPAN') {
          emoteId = child.getAttribute('data-emote-id') || null;
        }
      }
      if (contentEl.textContent) {
        text = contentEl.textContent.trim();
      }

      return {
        streamName: streamName ? streamName : undefined,
        username: username ? username : undefined,
        text: text ? text : undefined,
        emoteId: emoteId ? emoteId : undefined,
      };
    }
    catch (error) {
      console.warn("scrape-kick: error parsing message", error);
      return null;
    }
  } // End of parseMessageBody

  const streamName = getStreamName();
  if (!streamName) {
    console.warn("scrape-kick: unsupported platform during parseMessage");
    return null;
  }

  // Main parsing logic
  const messageBody = (((root.children[0]).children[0]).children);

  // Reply message structure
  if (messageBody.length === 2) {
    try {
      const replyMessageBody = messageBody[1].children;
      return parseMessageBody(replyMessageBody, id);
    }
    catch (error) {
      console.warn(`scrape-kick: error parsing reply messageId: ${id}, error: ${error}`);
      return null;
    }
  }

  // Normal Message Structure
  else {
    try {
      return parseMessageBody(messageBody, id);
    }
    catch (error) {
      console.warn(`scrape-kick: error parsing normal messageId: ${id}, error: ${error}`);
      return null;
    }
  }
}