# BaitBlock

A Chrome extension that detects and highlights phishing messages in live chat streams on Kick.com using AI classification. 

## Overview

- This is a project developed for the class "Trust and Safety" with Professor Rosanna Bellini at New York University. It was developed both for Kick user protection and to study phishing vectors on Kick. 

- `src/` contains the scripts for scraping a stream's chat room and sending it to Supabase. If you are not interested in the AI labeling feature and simply want to collect Kick messages in real-time, comment out the code that sends and recieves data from the backend in `src/background/index.ts` and the UI injection code in `src/content/index.ts`. Then simply follow the set up instructions below.

- Demo: [![BaitBlock Demo](https://img.youtube.com/vi/cQIUO8_igs4/hqdefault.jpg)](https://www.youtube.com/watch?v=cQIUO8_igs4)

## Architecture

The project consists of three main components:

### 1. The Extension (`/src/)
   - **Frontend (React + Vite)**
      - `App.tsx`: Main application component
      - `components/feed-toggle.tsx`: Toggle switch to enable/disable chat monitoring
      - `supabase-client.ts`: Initializes Supabase client for data persistence

   - **Content Script (`src/content/`)**
      Runs on the webpage to monitor chat activity:
      - **`scrape-kick.ts`**: Scrapes chat messages from Kick's DOM using MutationObserver. Extracts message metadata (username, text, emotes, stream name)
      - **`url-listener.ts`**: Detects when user is on a Kick stream

   - **Background Service Worker (`src/background/`)**
      Orchestrates message flow and AI classification:
      - **`index.ts`**: Interacts with the backend server and Supabase.

### 2. **Backend Server (`server/`) **
- **Local Server (Python FastAPI) `server.py`**: 
  - Endpoint: `POST /label_messages`
  - Accepts batches of messages
  - Classifies messages using BERT model
  - Inserts classified results into Supabase
  
- **Classification Model (PyTorch + HugginFace) `bert_label.py`**: 
  - The classification model used is: [ealvaradob/bert-finetuned-phishing](https://huggingface.co/ealvaradob/bert-finetuned-phishing)
  - Outputs phishing probability scores and classify the messages as phishing, uncertain, or benign.

### 3. **Data Management (`data/`) **
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

2. *** Optional: ***  Create a table in Supabase and create a RLS policy that allows for anon inserts. Copy `.env.example` into your `.env` file and enter your Supabase credentials for data collection. This is not required for the extension to work. Don't forget to comment out the Supabase code.
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

## Known Limitations

- The model used has a high false positive rate since it was trained on traditional phishing vectors, not livestream chat messages. I mannually required a confidence threshold of 0.999997 in `server/bert_label.py` for the model to label a message.
