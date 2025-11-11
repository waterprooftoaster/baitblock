import { isPageSupported } from "./url-listener";
import { initChatScraper } from "./chat-scraper";

isPageSupported((supported) => {
  if (supported) {
    console.log("Page Supported");

    // Start scraping comments when page is supported
    initChatScraper((message) => {
      console.log(`[${message.platform.toUpperCase()}] ${message.username}: ${message.message}`);
      // You can dispatch this to background script or handle as needed
    });
  } else {
    console.log("Page Not Supported");
  }
})