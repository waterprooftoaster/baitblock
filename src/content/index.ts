/// <reference types="chrome" />
import { isValidPage } from "./url-listener";
import { chatScraper } from "./scrape-kick";

isValidPage((streamName) => {
  if (streamName) {
    console.log(`on a supported page: ${streamName}`);

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