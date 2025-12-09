# analysis/analyze.py
import pandas as pd
from collections import Counter
from supabase_client import get_client

CSV_PATH = "kick_messages.csv"

# Map usernames to stream categories
STREAMER_CATEGORY = {
  "solcodes" : "trading",
  "solpengu247" : "trading",
  "asmongold" : "just_chatting",
  "xqc" : "just_chatting",
  "bigsiix" : "just_chatting",
  "zombx100" : "casino",
  "hkari111" : "just_chatting",
  "igtlucifer" : "just_chatting",
  "livetraderron" : "trading",
  "scarmyyy" : "just_chatting",
  "itsstolen" : "casino",
  "ceasersaladgaming" : "casino",
  "bcx91" : "casino",
  "lilfin" : "casino",
  "degendaddy" : "casino",
  "notsosane187" : "just_chatting",
  "solpump247" : "trading",
}

# Map usernames to stream sizes
STREAMER_SIZE = {
    "xqc" : 1000000,
    "asmongold" : 214600, 
    "bigsiix" : 5100,
    "zombx100" : 81, 
    "hkari111" : 23,
    "igtlucifer" : 161,
    "livetraderron" : 133,
    "solcodes" : 254,
    "solpengu247" : 37,
    "scarmyyy" : 35,
    "itsstolen" : 1500,
    "ceasersaladgaming" : 1400,
    "bcx91" : 5300,
    "lilfin" : 1800,
    "shanrr" : 3100,
    "degendaddy" : 1200,
    "solpump247" : 327,
    "notsosane187" : 817,
    
}

def load_data(path: str) -> pd.DataFrame:
    df = pd.read_csv(path)

    # Keep only the columns we care about
    expected_cols = {"username", "text", "emote_id", "timestamp"}
    missing = expected_cols - set(df.columns)
    df["username"] = df["username"].str.lower()
    if missing:
        raise ValueError(f"CSV is missing columns: {missing}")
    

    return df


def add_metadata(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    # Map username -> category/size; default to "unknown" if not in dict
    df["category"] = df["username"].map(STREAMER_CATEGORY).fillna("unknown")
    df["size"] = df["username"].map(STREAMER_SIZE).fillna("unknown")

    # Convert timestamp to datetime for time-based grouping later
    df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce")

    return df

def report_unknown_streamers(df: pd.DataFrame) -> None:
    unique_usernames = df["username"].unique()
    saveable = []
    supabase = get_client()
    for username in unique_usernames:
      if (not username in STREAMER_CATEGORY ) and (not username in STREAMER_SIZE):
        supabase.table("kick_messages").delete().eq("username", username).execute()
      if (not username in STREAMER_CATEGORY ) ^ (not username in STREAMER_SIZE):
        saveable.append(username)
    
    print('SAVEABLE STREAMERS????')
    for curr in saveable:
       print(curr)

def analyze_by_category(df: pd.DataFrame) -> None:
    counts = Counter(df["category"])
    total = sum(counts.values()) or 1  # avoid division by zero

    for category, count in counts.items():
        pct = (count / total) * 100
        print(f"{category}: {pct:.2f}%")

    print("Unknown streamer info (based on category/size mappings):")
    report_unknown_streamers(df)
    print()



def main():
    df = load_data(CSV_PATH)
    df = add_metadata(df)

    print("Message distribution by stream category:\n")
    analyze_by_category(df)


if __name__ == "__main__":
    main()