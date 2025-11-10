import { isPageSupported } from "../content/url-listener";

isPageSupported((supported) => {
  if (supported) {
    console.log("Youtube Live detected");
  } else {
    console.log("Not Youtube Live");
  }
})