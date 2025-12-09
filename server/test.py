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

if __name__ == "__main__":
    samples = [
        "Your account has been suspended—click here to verify your identity immediately.", "Congratulations! You've won a $500 gift card; claim it now before it expires.", "Unusual activity detected on your bank account, sign in now to secure it.", "Your parcel cannot be delivered unless you pay the outstanding fee here.", "We couldn't process your tax refund, update your payment info now.", "Reset your password using this link or your account will be closed tonight.", "Your crypto wallet has been compromised, click this link to recover your funds.", "Important: Your email storage is full, log in here to avoid losing messages.", "Immediate action required: verify your billing information to prevent service interruption.", "Your PayPal account has been flagged for fraud—log in now to restore access.", "Hey man, are you hopping on the game tonight?", "I'll be a bit late to dinner, save me a plate.", "Anyone know if the update drops this weekend?", "That streamer is hilarious, I can't stop watching.", "Good morning everyone, hope you're doing well.", "Does anyone have recommendations for a new keyboard?", "I finally beat the boss after three hours, let's go.", "What movie should I watch tonight?", "The weather is crazy today, huge winds outside.", "I'm heading out, see you all later."
    ]

    results = label(samples)

    print("\n=== TEST RESULTS ===")
    for text, r in zip(samples, results):
        print(f"Text: {repr(text)}")
        print(f"  Label:           {r['label']}")
        print(f"  Phishing score:  {r['phishing_score']}")
        print(f"  Benign score:    {r['benign_score']}")
        print()


