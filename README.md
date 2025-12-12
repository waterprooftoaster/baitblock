# BaitBlock

A Chrome extension that detects and highlights phishing messages in live chat streams on Kick.com using AI-powered classification.

## Overview

BaitBlock is a browser extension designed to protect streamers and viewers from malicious content by automatically detecting phishing attempts in Kick chat. The extension uses a fine-tuned BERT model to classify messages in real-time and visually highlights suspicious phishing content.

## Architecture

The project consists of three main components:

### 1. The Extension
   - **Frontend (React + Vite)** (`src/`)
      - `App.tsx`: Main application component
      - `components/feed-toggle.tsx`: Toggle switch to enable/disable chat monitoring
      - `supabase-client.ts`: Initializes Supabase client for data persistence

   - **Content Script** (`src/content/`)
      Runs on the webpage to monitor chat activity:
      - `scrape-kick.ts`**: Scrapes chat messages from Kick's DOM using MutationObserver
      - Extracts message metadata (username, text, emotes, stream name)

   - **`url-listener.ts`**: Detects when user is on a Kick stream

   - **Background Service Worker** (`src/background/`)
      Orchestrates message flow and AI classification:
      - `index.ts`: 
      - Receives chat messages from the content script
      - Forwards messages to the backend ML server for classification
      - Inserts all messages into Supabase database for archival
      - Receives phishing predictions and injects red outline styling into detected phishing messages

### 2. **Backend Server** (`server/`)
Python FastAPI server that performs ML classification:
- **`server.py`**: 
  - Endpoint: `POST /label_messages`
  - Accepts batches of messages
  - Classifies messages using BERT model
  - Inserts classified results into Supabase
  
- **`bert_label.py`**: 
  - The classification model used is: [ealvaradob/bert-finetuned-phishing](https://huggingface.co/ealvaradob/bert-finetuned-phishing)
  - Outputs phishing probability scores and classify the messages as phishing, uncertain, or benign.

### 3. **Data Management** (`data/`)
- **`analyze.py`**: Analysis data from supabase for the final report.

## Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                         Kick.com Chat                       │
└────────────────┬────────────────────────────────────────────┘
                 │ (DOM monitoring)
                 ▼
┌─────────────────────────────────────────────────────────────┐
│           Content Script (scrape-kick.ts)                   │
│  - Monitors #chatroom-messages for new messages             │
│  - Extracts username, text, emote_id, stream_name           │
│  - Filters low-quality messages                             │
└────────────────┬────────────────────────────────────────────┘
                 │ (chrome.runtime.sendMessage)
                 ▼
┌─────────────────────────────────────────────────────────────┐
│        Background Service Worker (index.ts)                 │
│  ├─ Receives newChatMessage                                 │
│  ├─ Stores in Chrome local storage (feedEnabled flag)       │
│  └─ Batches messages and sends to ML server every 1s        │
└────────────┬────────────────────────────┬────────────────────┘
             │                            │
             │ (POST to localhost:8000)   │ (Supabase insert)
             ▼                            ▼
┌──────────────────────────┐   ┌─────────────────┐
│  FastAPI ML Server       │   │   Supabase DB   │
│  (bert_label.py)         │   │                 │
│  - BERT Classification   │   │ - kick_messages │
│  - Confidence scoring    │   │ - proc_messages │
└──────────────┬───────────┘   └─────────────────┘
               │ (JSON response)
               ▼
┌─────────────────────────────────────────────────────────────┐
│        Background Service Worker (index.ts)                 │
│  - Receives [label, phishing_score] for each message        │
│  - Collects phishing_indexes                                │
│  - Sends to content script for UI injection                 │
└────────────────┬────────────────────────────────────────────┘
                 │ (chrome.runtime.sendMessage)
                 ▼
┌─────────────────────────────────────────────────────────────┐
│        Content Script (index.ts)                            │
│  - Receives phishingIndexes                                 │
│  - Finds DOM elements by data-index attribute               │
│  - Applies red outline styling to phishing messages         │
└─────────────────────────────────────────────────────────────┘
```

## Installation & Setup

### Prerequisites
- Node.js 18+
- Python 3.9+
- Chrome/Chromium browser
- Supabase account and credentials

### Frontend Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. *** Optional: *** Create a `.env` file with Supabase credentials for data collection. This is not required for the extension to work. Don't forget to comment out the Supabase code.
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_anon_key
   ```

3. Build the extension:
   ```bash
   npm run build
   ```

4. Load the extension in Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `dist/` folder

### Backend Setup

1. Create and activate a Python virtual environment:
   ```bash
   cd server
   python3 -m venv .venv
   source .venv/bin/activate
   ```
   On Windows, use: `.venv\Scripts\activate`

2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. *** Optional: *** Create `.env` file in `server/` with Supabase credentials:
   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_key
   ```

3. Run the FastAPI server:
   ```bash
   python -m uvicorn server:app --reload --port 8000
   ```

## File Structure

```
baitblock/
├── src/
│   ├── App.tsx                 # Main React component
│   ├── main.tsx                # React entry point
│   ├── supabase-client.ts      # Supabase configuration
│   ├── index.css               # Styling
│   ├── background/
│   │   └── index.ts            # Service worker (message orchestration)
│   ├── content/
│   │   ├── index.ts            # Content script entry (UI injection)
│   │   ├── scrape-kick.ts      # Chat message scraper
│   │   └── url-listener.ts     # Stream detection
│   └── components/
│       └── feed-toggle.tsx     # Toggle UI component
├── server/
│   ├── server.py               # FastAPI endpoint
│   ├── bert_label.py           # ML classification
│   ├── supabase_client.py      # DB client
│   └── mistral7b_label.py      # Alternative model (unused)
├── data/
│   ├── analyze.py              # Analysis utilities
│   ├── kick_messages.csv       # Chat archive
│   └── supabase_client.py      # Shared DB client
├── public/
│   └── manifest.json           # Chrome extension manifest
├── vite.config.ts              # Vite configuration
├── tsconfig.json               # TypeScript configuration
└── package.json                # Dependencies
```

## Known Limitations

- The model used has a high false positive rate since it was trained on traditional phishing vectors, not livestream chat messages. I mannually required a confidence threshold of 0.999997 in `server/bert_label.py` for the model to label a message.
