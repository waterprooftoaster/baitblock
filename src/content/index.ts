import { isPageSupported } from "../content/url-listener";

isPageSupported((supported) => {
  if (supported) {
    console.log("Page Supported");
  } else {
    console.log("Page Not Supported");
  }
})