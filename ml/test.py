from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch

model_id = "ealvaradob/bert-finetuned-phishing"

tokenizer = AutoTokenizer.from_pretrained(model_id)
model = AutoModelForSequenceClassification.from_pretrained(model_id)
model.eval()

# 1) Simple helper to classify a list of texts
def classify(texts: list[str]):
    # texts can be a single string or list of strings
    if isinstance(texts, str):
        texts = [texts]

    enc = tokenizer(
        texts,
        padding=True,
        truncation=True,
        return_tensors="pt"
    )

    with torch.no_grad():
        outputs = model(**enc)
        probs = torch.softmax(outputs.logits, dim=-1)

    # map indices -> labels (e.g. {0: 'NOT_PHISHING', 1: 'PHISHING'})
    id2label = model.config.id2label

    results = []
    for i, p in enumerate(probs):
        # p is a tensor of shape [num_labels]
        score, idx = torch.max(p, dim=0)
        label = id2label[int(idx)]
        results.append({
            "text": texts[i],
            "label": label,
            "score": float(score),
        })
    return results

# 2) Quick manual test
if __name__ == "__main__":
    samples = [
        "Click this link to claim your free prize now!",
        "Yo what's up guys",
    ]
    preds = classify(samples)
    for r in preds:
        print(r)