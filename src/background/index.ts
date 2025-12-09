/// <reference types="chrome" />
import { supabaseClient } from "../supabase-client";

const pendingMessages: [string, string][] = [];

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

      if (message.text) {
        pendingMessages.push(message.text);
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

// Send to model every second
setInterval(async () => {
  if (pendingMessages.length === 0) return;

  const toSend = [...pendingMessages];
  pendingMessages.length = 0;

  try {
    const res = await fetch("http://127.0.0.1:8000/label_messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toSend })
    });

    const results = await res.json();
    console.log("classifier results:", results);

  } catch (err) {
    console.warn("classifier failed", err);
  }

}, 1000);