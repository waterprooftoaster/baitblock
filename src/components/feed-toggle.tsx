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
    <div className="flex items-center justify-between gap-8 p-6 min-w-max">
      <label htmlFor="feed-toggle" className="text-2xl font-semibold text-gray-800">
        Capture Feed
      </label>
      <button
        id="feed-toggle"
        onClick={() => handleToggle({ target: { checked: !isEnabled } } as any)}
        className={`relative inline-flex h-10 w-20 items-center rounded-full transition-colors duration-300 ${isEnabled ? 'bg-blue-500' : 'bg-gray-300'
          }`}
      >
        <span
          className={`inline-block h-8 w-8 transform rounded-full bg-white shadow-lg transition-transform duration-300 ${isEnabled ? 'translate-x-10' : 'translate-x-1'
            }`}
        />
      </button>
    </div>
  );
}
