/// <reference types="chrome" />
import { supabaseClient } from "../supabase-client";

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.type === "newChatMessage") {
    const message = request.payload;

    // Check if feed capture is enabled
    chrome.storage.local.get(['feedEnabled'], async (result) => {
      const feedEnabled = result.feedEnabled !== false; // Default to true

      if (!feedEnabled) {
        sendResponse({ success: false, reason: 'Feed capture disabled' });
        return;
      }

      // Insert the message into the Supabase table
      try {
        const { data, error } = await supabaseClient
          .from("kick_messages")
          .insert([
            {
              stream_name: message.streamName || null,
              username: message.username || null,
              text: message.text || null,
              emote_id: message.emoteId || null,
              timestamp: new Date().toISOString(),
            },
          ])

          // Print out the inserted line for debugging
          .select();
        console.log("Supabase insert result:", { data, error });
        console.log("Message inserted successfully:", data);
        sendResponse({ success: true, data });
      }
      catch (error) {
        console.error("Error inserting message:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        sendResponse({ success: false, error: errorMessage });
      }
    });

    // Return true to indicate we'll send the response asynchronously
    return true;
  }
});
