from typing import List
from fastapi import FastAPI
from pydantic import BaseModel
from label_messages import label 

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

    return results