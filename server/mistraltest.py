from mistral7b_label import label

tests = [
    "yo can u mod me real quick?",
    "bro check this insane clip 😂",
    "hey can you help me vote for my team? login here real quick https://verify-twitch-user.com",
    "your account will be suspended if you don’t verify: http://twitch-security-check.net",
    "is this link safe?",
]

results = label(tests)

for t, r in zip(tests, results):
    print("TEXT:", t)
    print("LABEL:", r["label"])
    print("PHISHING SCORE:", r["phishing_score"])
    print("---")