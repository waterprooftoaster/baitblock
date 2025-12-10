/// <reference types="chrome" />
import { isValidPage } from "./url-listener";
import { chatScraper } from "./scrape-kick";

let scraperActive = false;

function startScraper() {
  if (scraperActive) return;
  scraperActive = true;

  chatScraper((message) => {
    if (!message) { return; }

    // Send to bg script
    chrome.runtime.sendMessage({
      type: "newChatMessage",
      payload: message
    })
  });
}

isValidPage((streamName) => {
  if (streamName) {
    console.log(`on a kick stream: ${streamName}`);

    // Check if feed is enabled in storage before starting
    chrome.storage.local.get(['feedEnabled'], (result) => {
      if (result.feedEnabled !== false) {
        startScraper();
      }
    });
  }
  else {
    console.log("Page Not Supported");
  }
})

// Listener for toggle and phishing indexes
chrome.runtime.onMessage.addListener((request, _sender, _response) => {
  // For toggle to work
  if (request.type === "feedToggle") {
    if (request.enabled && !scraperActive) {
      console.log("Feed toggled ON, starting scraper");
      startScraper();
    } else if (!request.enabled) {
      console.log("Feed toggled OFF");
      scraperActive = false;
    }
  }

  // For ui injection to work
  if (request.type === "phishingIndexes") {
    const phishingIndexes = request.payload;
    const chatContainer = document.getElementById("chatroom-messages");

    // Match the message by dataIndex to label correctly
    phishingIndexes.forEach((dataIndex: string) => {
      // Find container
      if (!chatContainer) {
        console.warn(`Could not find chat container in background/index.ts`)
        return;
      }

      // Find the message element
      const element = chatContainer.querySelector(`[data-index="${dataIndex}"]`);
      if (!element) {
        console.warn(`Could not find message ${dataIndex} in background/index.ts`);
        return;
      }

      // Outline the message div in red if phishing
      (element.children[0].children[0] as HTMLElement).style.outline = "2px solid red";
    });
  }
});