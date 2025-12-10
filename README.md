# BaitBlock

A Chrome extension that detects and highlights phishing messages in live chat streams on Kick.com using AI-powered classification.

## Overview

BaitBlock is a browser extension designed to protect streamers and viewers from malicious content by automatically detecting phishing attempts in Kick chat. The extension uses a fine-tuned BERT model to classify messages in real-time and visually highlights suspicious phishing content.

## Architecture

The project consists of three main components:

### 1. The Extension

   ####  **Frontend (React + Vite)** (`src/`)
   - **Purpose**: Provides the extension popup UI
   - **Key Files**:
   - `App.tsx`: Main application component
   - `components/feed-toggle.tsx`: Toggle switch to enable/disable chat monitoring
   - `supabase-client.ts`: Initializes Supabase client for data persistence

   #### **Content Script** (`src/content/`)
   Runs on the webpage to monitor chat activity:
   - **`scrape-kick.ts`**: Scrapes chat messages from Kick's DOM using MutationObserver
   - Monitors the chat container (`#chatroom-messages`)
   - Extracts message metadata (username, text, emotes, stream name)
   - Filters out messages shorter than 2 words or with no long words (potential links)
   
   - **`url-listener.ts`**: Detects when user is on a Kick stream
   - Polls for URL changes to handle single-page navigation
   - Validates that the user is on a valid Kick stream page
   - Returns the stream name for context

   #### **Background Service Worker** (`src/background/`)
   Orchestrates message flow and AI classification:
   - **`index.ts`**: 
   - Receives chat messages from the content script
   - Forwards messages to the backend ML server for classification
   - Inserts all messages into Supabase database for archival
   - Receives phishing predictions and injects red outline styling into detected phishing messages
   - Manages the feed toggle state via Chrome storage

### 2. **Backend Server** (`server/`)
Python FastAPI server that performs ML classification:
- **`server.py`**: 
  - Endpoint: `POST /label_messages`
  - Accepts batches of messages
  - Classifies messages using BERT model
  - Inserts classified results into Supabase
  
- **`bert_label.py`**: 
  - Uses fine-tuned BERT model (`ealvaradob/bert-finetuned-phishing`)
  - Outputs phishing probability scores
  - Configurable confidence threshold for uncertain classifications

### 3. **Data Management** (`data/`)
- **`analyze.py`**: Analysis utilities for processed messages
- **`kick_messages.csv`**: Raw chat data archive
- **`supabase_client.py`**: Shared Supabase client for Python scripts

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

2. Create a `.env.local` file with Supabase credentials:
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

2. Create `.env` file in `server/` with Supabase credentials:
   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_key
   ```

3. Run the FastAPI server:
   ```bash
   python -m uvicorn server:app --reload --port 8000
   ```

## Database Schema

### `kick_messages` table
Raw chat messages collected from streams:
```sql
- stream_name (text)
- username (text)
- text (text)
- emote_id (text)
- created_at (timestamp)
```

### `processed_messages` table
Classified messages with ML predictions:
```sql
- stream_name (text)
- text (text)
- label (text): 'phishing', 'benign', or 'uncertain'
- phishing_score (float): 0.0-1.0
- created_at (timestamp)
```

## Development

### Available Scripts

- `npm run dev` - Start Vite dev server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

### Key Technologies

- **Frontend**: React 19, TypeScript, Tailwind CSS, Vite
- **Extension**: Chrome Manifest V3
- **Backend**: Python, FastAPI, PyTorch, Transformers
- **Database**: Supabase (PostgreSQL)
- **ML Model**: BERT fine-tuned for phishing detection

## Configuration

### ML Model Confidence Threshold
Edit `server/bert_label.py`:
```python
confidence_threshold = 0.99997  # Adjust for sensitivity
```

### Message Filtering (Content Script)
Edit `src/content/scrape-kick.ts`:
```typescript
// Only messages with >2 words or containing long words (links)
if ((message.text.length > 2) || message.text.split(/\s+/).some(w => w.length > 10))
```

### Backend Polling Interval
Edit `src/background/index.ts`:
```typescript
setInterval(async () => { ... }, 1000)  // 1 second batch interval
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

- Only works on Kick.com streams
- Requires local backend server running (`localhost:8000`)
- Phishing detection model confidence threshold is high (0.99997) to minimize false positives
- Uncertain classifications are flagged but not visually highlighted
- Only monitors chat streams where the extension is explicitly enabled

## Future Improvements

- Add support for additional streaming platforms
- Implement cloud-based ML inference (remove local server requirement)
- Add user feedback mechanism to improve model accuracy
- Create analytics dashboard for detected phishing patterns
- Support for multiple languages
- Real-time confidence score display

## License

See LICENSE file for details.

## Research & Documentation

- Intention document: `documents/intention-document.tex`
- Midpoint report: `documents/midpoint-report.tex`
- Bibliography: `documents/refs.bib`
