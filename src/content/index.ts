import { isPageSupported } from "./url-listener";
import { chatScraper } from "./scrape-kick";

isPageSupported((supported) => {
  if (supported) {
    console.log("Page Supported");

    // Start scraping comments when page is supported
    chatScraper((message) => {
      let messageText = "";
      const username = message.username ? message.username : "Unknown";
      if (!message) { return; }
      if (message.text) {
        messageText += message.text;
      }
      if (message.emoteId) {
        messageText += ` [emoteId:${message.emoteId}]`;
      }
      console.log(`${username}: ${messageText}`);
    });
  } else {
    console.log("Page Not Supported");
  }
})