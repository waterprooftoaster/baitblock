from typing import List, Tuple
from fastapi import FastAPI
from pydantic import BaseModel
from bert_label import label

app = FastAPI()

class ClassifyRequest(BaseModel):
    messages: List[Tuple[str, str]]

@app.post("/label_messages")
def classify_endpoint(body: ClassifyRequest):
    """
    Accepts: {"texts": ["msg1", "msg2", ...]}
    Returns: list of label dicts from label_messages.label()
    """
    texts = [msg[1] for msg in body.messages]
    stream_names = [msg[0] for msg in body.messages]
    results = label(texts)
    
    # Insert results into Supabase
    supabase = get_client()
    
    # Bundle rows for fast insertion
    rows = []
    for i, result in enumerate(results):
        rows.append({
            "stream_name": stream_names[i],
            "text": texts[i],
            "label": result["label"],
            "phishing_score": result["phishing_score"],
        })
    supabase.table("processed_messages").insert(rows).execute()

    return results