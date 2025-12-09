/// <reference types="chrome" />
import { isValidPage } from "./url-listener";
import { chatScraper } from "./scrape-kick";

isValidPage((streamName) => {
  if (streamName) {
    console.log(`on a kick stream: ${streamName}`);

    // Start scraping comments when page is supported
    chatScraper((message) => {
      if (!message) { return; }

      // Send to bg script
      chrome.runtime.sendMessage({
        type: "newChatMessage",
        payload: message
      })

      // Print to console
      // let messageText = "";
      // const username = message.username ? message.username : "Unknown";
      // if (!message) { return; }
      // if (message.text) {
      //   messageText += message.text;
      // }
      // if (message.emoteId) {
      //   messageText += ` [emoteId:${message.emoteId}]`;
      // }
      // console.log(`${username}: ${messageText}`);
    });
  }
  else {
    console.log("Page Not Supported");
  }
})

// Listen for labeling results from background script
chrome.runtime.onMessage.addListener((request, _sender, _response) => {
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
      (element.children[0] as HTMLElement).style.outline = "2px solid red";
    });
  }
});