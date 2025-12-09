from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch

model_id = "ealvaradob/bert-finetuned-phishing"
tokenizer = AutoTokenizer.from_pretrained(model_id)
model = AutoModelForSequenceClassification.from_pretrained(model_id)
model.eval()

confidence_threshold = 0.8  # tune this

def label(texts: list[str]):
    if isinstance(texts, str):
        texts = [texts]

    enc = tokenizer(
        texts,
        padding=True,
        truncation=True,
        return_tensors="pt",
    )

    with torch.no_grad():
        outputs = model(**enc)
        probs = torch.softmax(outputs.logits, dim=-1)

    id2label = model.config.id2label

    results = []
    for i, p in enumerate(probs):
        phishing_score = float(p[1])
        benign_score = float(p[0])
        score, idx = torch.max(p, dim=0)
        score_float = float(score)

        # Handle uncertain labels
        label = id2label[int(idx)]
        if score_float < confidence_threshold:
            label = "uncertain"

        results.append(
            {
                "label": label,
                "phishing_score": phishing_score,
                "benign_score" : benign_score
            }
        )

    return results