from transformers import AutoTokenizer, AutoModelForCausalLM
import torch
import json
import re

model_id = "Bilic/Mistral-7B-LLM-Fraud-Detection"
tokenizer = AutoTokenizer.from_pretrained(model_id)

# Adjust dtype / device_map as needed
if torch.cuda.is_available():
    model = AutoModelForCausalLM.from_pretrained(
        model_id,
        torch_dtype=torch.float16,
        device_map="auto",
    )
else:
    model = AutoModelForCausalLM.from_pretrained(model_id)

model.eval()

confidence_threshold = 0.9


def _build_prompt(message: str) -> str:
    # Keep it strict so parsing is easier
    return f"""You are a fraud detection classifier.

Classify the following chat message as "phishing", "uncertain", or "benign". And give it a score between 0 and 1 indicating your confidence that it is phishing. 1 means definitely phishing, 0 means definitely benign.
Respond ONLY with a single JSON object of the form:
{{"label": "phishing" or "uncertain" or "benign", "score": <float between 0 and 1>}}

Message: {json.dumps(message)}

JSON:
"""

def _call_model(prompt: str) -> str:
    inputs = tokenizer(prompt, return_tensors="pt")
    if torch.cuda.is_available():
        inputs = {k: v.to(model.device) for k, v in inputs.items()}

    with torch.no_grad():
        output_ids = model.generate(
            **inputs,
            max_new_tokens=64,
            do_sample=False,
            temperature=0.1,
        )

    # Strip the prompt part and decode only the new tokens
    generated_ids = output_ids[0, inputs["input_ids"].shape[1]:]
    generated_text = tokenizer.decode(generated_ids, skip_special_tokens=True)
    return generated_text.strip()


def _parse_json(generated: str) -> dict | None:
    # Try to find a JSON object in the output
    match = re.search(r"\{.*\}", generated, flags=re.DOTALL)
    if not match:
        return None

    try:
        obj = json.loads(match.group(0))
        return obj
    except json.JSONDecodeError:
        return None


def label(texts: list[str] | str):
    if isinstance(texts, str):
        texts = [texts]

    results = []

    for text in texts:
        prompt = _build_prompt(text)
        raw_output = _call_model(prompt)
        parsed = _parse_json(raw_output)

        # Fallbacks
        if not parsed or "label" not in parsed or "score" not in parsed:
            label_value = "uncertain"
            score = 0.0
        else:
            label_value = str(parsed["label"]).strip()
            try:
                score = float(parsed["score"])
            except (TypeError, ValueError):
                score = 0.0

        # Normalize labels to your expected space
        if label_value.lower() not in {"phishing", "not_phishing"}:
            label_value = "uncertain"

        phishing_score = score if label_value == "phishing" else 1.0 - score
        benign_score = 1.0 - phishing_score

        # Apply confidence threshold
        if score < confidence_threshold:
            final_label = "uncertain"
        else:
            # map to your previous style: "phishing" / "benign"
            if label_value == "phishing":
                final_label = "phishing"
            elif label_value == "not_phishing":
                final_label = "benign"
            else:
                final_label = "uncertain"

        results.append(
            {
                "label": final_label,
                "phishing_score": float(phishing_score),
            }
        )

    return results