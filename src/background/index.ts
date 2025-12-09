/// <reference types="chrome" />
import { supabaseClient } from "../supabase-client";

const pendingMessages: [string, string, string][] = [];

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.type === "newChatMessage") {
    const message = request.payload;

    // Check if feed capture is enabled
    chrome.storage.local.get(['feedEnabled'], async (result) => {
      const feedEnabled = result.feedEnabled !== false; // Default to true

      // Feed button
      if (!feedEnabled) {
        sendResponse({ success: false, reason: 'Feed capture disabled' });
        return;
      }

      // Only add to model if text is more than 2 words or has a very long word (link)
      if ((message.text && message.text.trim().split(/\s+/).length > 2)
        || message.text.split(/\s+/).some((w: string) => w.length > 10)) {
        pendingMessages.push([message.streamName, message.text, message.dataIndex]);
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
            }
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

  // Get the text to send to the model
  // Copy and clear the pending messages to avoid race conditions, keep a copy for indexing
  const toSend = pendingMessages.map((msg) => [msg[0], msg[1]]);
  const dataIndex = pendingMessages.map((msg) => msg[2]);
  pendingMessages.length = 0;

  try {
    const res = await fetch("http://127.0.0.1:8000/label_messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: toSend })
    });

    const results = await res.json();

    // Find all index labeled as phishing
    const phishingIndexes: string[] = [];
    for (let i = 0; i < results.length; i++) {
      if (results[i].label === "phishing") {
        phishingIndexes.push(dataIndex[i]);
      }
    }

    // Send it back to content script for injection
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: "phishingIndexes",
          payload: phishingIndexes
        });
      }
    });

  } catch (error) {
    console.warn(`classifier failed: ${error}`);
  }
}, 1000);