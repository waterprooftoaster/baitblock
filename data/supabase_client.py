import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables from .env (e.g., ml/.env or project root)
load_dotenv()


def get_client() -> Client:
    """
    Return a Supabase client configured from environment variables.

    Required env vars:
      - SUPABASE_URL
      - SUPABASE_SERVICE_ROLE_KEY
    """
    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_ANON_KEY"]
    return create_client(url, key)