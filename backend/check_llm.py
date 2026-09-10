"""
check_llm.py
------------
Lists the models your API key can actually use, and sends one test request.

Run this whenever the assistant returns a 404 from the provider:
    python check_llm.py
"""
import os
import requests

import env_loader  # noqa: F401  (importing it loads .env)

provider = os.environ.get("LLM_PROVIDER", "groq").lower()
print(f"LLM_PROVIDER = {provider}\n")

if provider == "gemini":
    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        raise SystemExit("GEMINI_API_KEY is not set in .env")
    r = requests.get(
        f"https://generativelanguage.googleapis.com/v1beta/models?key={key}",
        timeout=20,
    )
    r.raise_for_status()
    names = [
        m["name"].split("/")[-1] for m in r.json().get("models", [])
        if "generateContent" in m.get("supportedGenerationMethods", [])
    ]
    print(f"{len(names)} usable models:")
    for n in names:
        print("   ", n)
    print("\nSet one in .env, for example:  GEMINI_MODEL=gemini-1.5-flash")
    raise SystemExit(0)

key = os.environ.get("GROQ_API_KEY")
if not key:
    raise SystemExit("GROQ_API_KEY is not set in .env")

r = requests.get(
    "https://api.groq.com/openai/v1/models",
    headers={"Authorization": f"Bearer {key}"},
    timeout=20,
)

if r.status_code == 401:
    raise SystemExit("Groq rejected the key (401). Check GROQ_API_KEY in .env.")
r.raise_for_status()

models = sorted(m["id"] for m in r.json().get("data", []))
chat = [m for m in models
        if not any(x in m for x in ("whisper", "tts", "guard", "embed"))]

print(f"{len(models)} models visible, {len(chat)} usable for chat:\n")
for m in chat:
    print("   ", m)

if not chat:
    raise SystemExit("\nNo chat models available on this key.")

pick = chat[0]
print(f"\nSending a test request to {pick} ...")
t = requests.post(
    "https://api.groq.com/openai/v1/chat/completions",
    headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
    json={
        "model": pick,
        "messages": [{"role": "user", "content": "Reply with the single word: working"}],
        "max_tokens": 10,
    },
    timeout=30,
)

if t.ok:
    print("Reply:", t.json()["choices"][0]["message"]["content"].strip())
    print(f"\nWorking. rag_engine picks a model automatically, but to pin it:")
    print(f"    GROQ_MODEL={pick}")
else:
    print(f"Failed: {t.status_code} {t.text[:200]}")