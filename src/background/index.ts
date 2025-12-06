/// <reference types="chrome" />
import { supabaseClient } from "../supabase";

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.type === "newChatMessage") {
    const message = request.payload;

    // Insert the message into the Supabase table
    (async () => {
      try {
        const { data, error } = await supabaseClient
          .from("kick_messages")
          .insert([
            {
              username: message.username || null,
              text: message.text || null,
              emoteId: message.emoteId || null,
              timestamp: message.timestamp || new Date().toISOString(),
              isReply: message.isReply || false
            },
          ]);

        if (error) {
          console.error("Error inserting message:", error);
          sendResponse({ success: false, error: error.message });
        } else {
          console.log("Message inserted successfully:", data);
          sendResponse({ success: true, data });
        }
      } catch (error) {
        console.error("Unexpected error:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        sendResponse({ success: false, error: errorMessage });
      }
    })();

    // Return true to indicate we'll send the response asynchronously
    return true;
  }
});
