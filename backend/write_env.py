"""
write_env.py
------------
Writes a clean .env in plain ASCII. Use this instead of PowerShell, which
keeps producing UTF-16 files and here-string leftovers.

    python write_env.py
"""
import os
from pathlib import Path

DEFAULTS = {
    "DATABASE_URL": "postgresql://postgres:Parth0709@127.0.0.1:5432/cse_agent",
    "LLM_PROVIDER": "groq",
    "GROQ_API_KEY": "",
}

path = Path(__file__).with_name(".env")

# Keep anything already set correctly, so re-running is safe.
existing = {}
if path.is_file():
    raw = path.read_bytes()
    for enc in ("utf-8-sig", "utf-8", "utf-16", "latin-1"):
        try:
            text = raw.decode(enc)
            break
        except (UnicodeDecodeError, UnicodeError):
            continue
    else:
        text = ""
    for line in text.splitlines():
        line = line.strip().lstrip("\ufeff")
        if "=" in line and not line.startswith(("#", "@", '"')) and "|Set-Content" not in line:
            k, _, v = line.partition("=")
            if k.strip().replace("_", "").isalnum():
                existing[k.strip()] = v.strip().strip('"').strip("'")

values = {**DEFAULTS, **existing}

print("Press Enter to keep the value shown in brackets.\n")
for key in DEFAULTS:
    shown = values.get(key, "")
    if "KEY" in key and shown:
        shown_display = shown[:8] + "..." + shown[-4:]
    else:
        shown_display = shown or "(empty)"
    entered = input(f"{key} [{shown_display}]: ").strip()
    if entered:
        values[key] = entered

if not values.get("GROQ_API_KEY") and values.get("LLM_PROVIDER") == "groq":
    print("\nWARNING: GROQ_API_KEY is empty. The assistant cannot answer without it.")

body = "".join(f"{k}={v}\n" for k, v in values.items() if v)
path.write_bytes(body.encode("ascii", errors="ignore"))

print(f"\nWrote {path} ({len(body)} bytes, ASCII)\n")
for line in body.splitlines():
    k, _, v = line.partition("=")
    print(f"  {k}={'***' if 'KEY' in k else v}")

print("\nNow run:  python check_llm.py")
