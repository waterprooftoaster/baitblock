import { isPageSupported } from "./url-listener";
import { chatScraper } from "./scrape-kick";

isPageSupported((supported) => {
  if (supported) {
    console.log("Page Supported");

    // Start scraping comments when page is supported
    chatScraper((message) => {
      const username = message.username ? message.username : "Unknown";
      const messageText = message.message ? message.message : "Unknown";
      console.log(`${username}: ${messageText}`);
    });
  } else {
    console.log("Page Not Supported");
  }
})