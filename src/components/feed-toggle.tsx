import { useState, useEffect } from 'react';

export function FeedToggle() {
  const [isEnabled, setIsEnabled] = useState(true);

  useEffect(() => {
    // Load saved state from Chrome storage
    chrome.storage.local.get(['feedEnabled'], (result) => {
      if (result.feedEnabled !== undefined) {
        setIsEnabled(result.feedEnabled as boolean);
      }
    });
  }, []);

  const handleToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newState = e.target.checked;
    setIsEnabled(newState);

    // Save to Chrome storage
    chrome.storage.local.set({ feedEnabled: newState });

    // Send message to content script to update behavior
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, {
            type: 'feedToggle',
            enabled: newState
          }).catch(() => {
            // Ignore errors for tabs that don't have content script
            console.log(`No content script in tab: ${tab.id}`);
          });
        }
      });
    });
  };

  return (
    <div className="flex items-center justify-between gap-4 p-6 min-w-max">
      <label htmlFor="feed-toggle" className="text-base font-medium">
        Capture Feed
      </label>
      <input
        id="feed-toggle"
        type="checkbox"
        checked={isEnabled}
        onChange={handleToggle}
        className="w-6 h-6 cursor-pointer"
      />
    </div>
  );
}
