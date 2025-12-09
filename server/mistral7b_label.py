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

# For calling something benign
confidence_threshold = 0.9
# Must exceed this to label as phishing
phishing_absolute_threshold = 0.99


def _build_prompt(message: str) -> str:
    # Keep the contract strict so parsing is easier
    return f"""You are a fraud detection classifier.

Classify the following chat message as "phishing", "uncertain", or "benign".
Also give a score between 0 and 1 indicating your confidence that it is phishing:
- 1 means definitely phishing
- 0 means definitely benign

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

    results: list[dict] = []

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

        # Normalize labels to our expected space: phishing / benign / uncertain
        raw_label = label_value.lower()
        if raw_label in {"phishing", "fraud", "scam"}:
            norm_label = "phishing"
        elif raw_label in {
            "benign",
            "legit",
            "legitimate",
            "not_phishing",
            "not phishing",
            "ham",
            "safe",
        }:
            norm_label = "benign"
        elif raw_label in {
            "uncertain",
            "unsure",
            "unknown",
            "cannot_tell",
            "cant_tell",
            "can't_tell",
        }:
            norm_label = "uncertain"
        else:
            norm_label = "uncertain"

        # Score is confidence it is phishing: 1 = definitely phishing, 0 = definitely benign
        score = max(0.0, min(1.0, score))
        phishing_score = score

        # Default: uncertain
        final_label = "uncertain"

        # Only label phishing if ABSOLUTELY certain
        if norm_label == "phishing" and phishing_score >= phishing_absolute_threshold:
            final_label = "phishing"
        # Label benign if confidently benign
        elif norm_label == "benign" and (1.0 - phishing_score) >= confidence_threshold:
            final_label = "benign"

        results.append(
            {
                "label": final_label,  # "phishing" | "benign" | "uncertain"
                "phishing_score": float(phishing_score),
            }
        )

    return results