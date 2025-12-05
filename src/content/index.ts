import { isPageSupported } from "./url-listener";
import { chatScraper } from "./scrape-kick";

isPageSupported((supported) => {
  if (supported) {
    console.log("Page Supported");

    // Start scraping comments when page is supported
    chatScraper((message) => {
      console.log(`${message.username}: ${message.message}`);
    });
  } else {
    console.log("Page Not Supported");
  }
})