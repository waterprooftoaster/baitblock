from typing import List
from fastapi import FastAPI
from pydantic import BaseModel
from server.bert_label import label
from supabase_client import get_client

app = FastAPI()

class ClassifyRequest(BaseModel):
    texts: List[str]

@app.post("/label_messages")
def classify_endpoint(body: ClassifyRequest):
    """
    Accepts: {"texts": ["msg1", "msg2", ...]}
    Returns: list of label dicts from label_messages.label()
    """
    results = label(body.texts)
    
    # Insert results into Supabase
    supabase = get_client()
    
    # Bundle rows for fast insertion
    rows = []
    for i, result in enumerate(results):
        rows.append({
            "text": body.texts[i],
            "label": result["label"],
            "phishing_score": result["phishing_score"],
            "benign_score": result["benign_score"],
        })
    supabase.table("processed_messages").insert(rows).execute()

    return results