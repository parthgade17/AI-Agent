"""
ai_compose.py
-------------
Writes the announcement text for student achievements and events using
openai/gpt-oss-120b, then hands it to the HOD for approval.

Reuses rag_engine's key rotation and model resolution rather than
duplicating them, so a dead or rate-limited Groq key rolls over here too.

If the LLM is unavailable the caller still gets a usable message from the
template fallback. A submission must never be lost because Groq was down.
"""

import re
import urllib.parse
from datetime import datetime
from typing import Any

import requests

import rag_engine

TIMEOUT = 40
MAX_TOKENS = 600

# The message is never valid without this exact line at the end (rule 6 in
# the system prompt below). If it's missing, the response was cut short by
# the token limit (or something else went wrong mid-generation) -- treating
# that as a hard failure and falling back to the template is much safer
# than sending a half-written announcement out to the department.
REQUIRED_SIGNOFF = "Department of Computer Science and Engineering, Sanjivani University"

SYSTEM_PROMPT = """You write short WhatsApp announcements for the Department of \
Computer Science and Engineering, Sanjivani University, Kopargaon.

Rules:
1. Use ONLY the facts given. Never invent a name, date, prize, venue or link.
2. Plain text for WhatsApp — no markdown (no asterisks, no hashtags, no
   backticks) and no emoji or symbol characters of any kind. Exclamation
   marks are encouraged where they fit ("Congratulations!", "Well done!") —
   the department system adds a couple of emoji itself afterwards, so do
   not attempt to include any.
3. Six lines or fewer. Short sentences.
4. Warm and genuinely celebratory, while still reading as an official
   department message rather than marketing.
5. If a certificate or photo link is given in the facts, include it on its
   own line, near the end, exactly as written — e.g. "Certificate: <link>".
6. End with exactly this line:
   Department of Computer Science and Engineering, Sanjivani University
7. Output the message only. No preamble, no explanation, no quotation marks.
"""

# Emoji are inserted here in Python, not left to the model. Open-weight
# models served over an API (gpt-oss-120b included) routinely mangle emoji —
# their tokenizers can split a single emoji's byte sequence across tokens,
# and if generation is cut or mis-decoded mid-character the result is a
# broken replacement glyph ("�") instead of the intended emoji. A literal
# written here in source is always the correct, complete character, so this
# sidesteps the problem entirely rather than trying to fix the model's output.
EMOJI_OPENING = {"achievement": "🎉", "event": "📢"}
EMOJI_CLOSING = {"achievement": "🏆", "event": "🗓️"}

# Matches stray emoji/symbol characters and the Unicode replacement
# character, in case the model adds one despite rule 2 above, or a network
# hiccup corrupts one in transit. Scrubbed before we add our own good ones.
_STRAY_SYMBOL_RE = re.compile(
    "["
    "\U0001F300-\U0001FAFF"  # pictographs, emoticons, transport, supplemental symbols
    "\U00002600-\U000027BF"  # misc symbols, dingbats
    "\U0001F1E6-\U0001F1FF"  # regional indicator letters
    "\uFE0F"                  # variation selector-16 (emoji presentation)
    "\uFFFD"                  # replacement character (a corrupted glyph)
    "]",
    flags=re.UNICODE,
)


def strip_stray_symbols(text: str) -> str:
    """Remove any emoji/symbol/replacement characters, so we control exactly
    which (correct, literal) emoji end up in the final message."""
    return _STRAY_SYMBOL_RE.sub("", text)


def looks_complete(text: str) -> bool:
    """False means treat this as a failed generation, not a shorter message."""
    return REQUIRED_SIGNOFF in text


def add_emoji_flourish(text: str, kind: str) -> str:
    """Add one opening and one closing emoji at fixed, sensible spots.

    Opening emoji goes at the end of the first non-empty line (the headline
    sentence). Closing emoji goes at the end of the line right before the
    department sign-off, if there is a sensible line to attach it to.
    """
    opening = EMOJI_OPENING.get(kind)
    closing = EMOJI_CLOSING.get(kind)
    lines = text.split("\n")

    if opening:
        for i, ln in enumerate(lines):
            if ln.strip():
                lines[i] = f"{ln.rstrip()} {opening}"
                break

    if closing:
        sign_idx = next(
            (i for i in range(len(lines) - 1, -1, -1)
             if "Department of Computer Science" in lines[i]),
            None,
        )
        if sign_idx is not None:
            prev = sign_idx - 1
            while prev >= 0 and not lines[prev].strip():
                prev -= 1
            if prev >= 0 and "Certificate:" not in lines[prev] and "Register:" not in lines[prev]:
                lines[prev] = f"{lines[prev].rstrip()} {closing}"

    return "\n".join(lines)


def chat(system: str, user: str) -> tuple[str, str]:
    """One Groq completion, rotating across every configured key.

    Returns (text, model_id). Raises RuntimeError only when every key fails,
    which the callers below catch and fall back from.
    """
    keys = rag_engine.groq_keys()
    if not keys:
        raise RuntimeError("No GROQ_API_KEY is configured")

    model_id = rag_engine.groq_model()
    errors = []

    for attempt in range(len(keys)):
        key = keys[(rag_engine._key_index + attempt) % len(keys)]
        r = requests.post(
            rag_engine.GROQ_URL,
            headers={"Authorization": f"Bearer {key}",
                     "Content-Type": "application/json"},
            json={
                "model": model_id,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                "temperature": 0.4,       # a little warmth, still factual
                "max_tokens": MAX_TOKENS,
            },
            timeout=TIMEOUT,
        )
        if r.ok:
            rag_engine._key_index = (rag_engine._key_index + attempt) % len(keys)
            text = r.json()["choices"][0]["message"]["content"].strip()
            return clean(text), model_id
        if r.status_code in (401, 429):
            errors.append(f"key ...{key[-6:]} {'invalid' if r.status_code == 401 else 'rate limited'}")
            continue
        r.raise_for_status()

    raise RuntimeError("Every Groq key failed: " + "; ".join(errors))


def clean(text: str) -> str:
    """Strip the formatting models add despite being told not to."""
    text = text.strip().strip('"').strip("'")
    text = strip_stray_symbols(text)
    for marker in ("**", "*", "#", "`"):
        text = text.replace(marker, "")
    # Drop a leading "Here is..." line if the model added one.
    lines = [ln.rstrip() for ln in text.splitlines()]
    if lines and lines[0].lower().startswith(("here is", "here's", "sure,")):
        lines = lines[1:]
    return "\n".join(ln for ln in lines if ln.strip() or True).strip()


def fmt_date(value: Any, with_time: bool = False) -> str:
    if not value:
        return "date to be announced"
    if isinstance(value, str):
        try:
            value = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return value
    return value.strftime("%d %B %Y, %I:%M %p" if with_time else "%d %B %Y")


# ---------------------------------------------------------------- fallbacks

def template_achievement(r: dict) -> str:
    bits = [f"Congratulations to {r['student_name']}"]
    if r.get("position"):
        bits.append(f"on securing {r['position']}")
    if r.get("event_name"):
        bits.append(f"at {r['event_name']}")
    if r.get("organiser"):
        bits.append(f"organised by {r['organiser']}")
    line = " ".join(bits) + "! 🎉"

    prize = f"\nPrize: Rs. {int(r['prize_amount']):,}" if r.get("prize_amount") else ""
    cert = f"\nCertificate: {r['proof_url']}" if r.get("proof_url") else ""
    return (
        f"CSE Student Achievement 🏆\n\n{line}{prize}\n\n"
        f"We are proud of this achievement and wish continued success!"
        f"{cert}\n\n"
        f"Department of Computer Science and Engineering, Sanjivani University"
    )


def template_event(r: dict) -> str:
    scope = "Institute" if r.get("scope") == "institute" else "CSE Department"
    venue = f"\nVenue: {r['venue']}" if r.get("venue") else ""
    speaker = f"\nSpeaker: {r['speaker']}" if r.get("speaker") else ""
    link = f"\nRegister: {r['registration_link']}" if r.get("registration_link") else ""
    return (
        f"Upcoming {scope} Event\n\n{r['title']}\n"
        f"Date: {fmt_date(r.get('starts_at'), True)}{venue}{speaker}{link}\n\n"
        f"Department of Computer Science and Engineering, Sanjivani University"
    )


# ------------------------------------------------------------------ writers

def compose_achievement(r: dict) -> tuple[str, str]:
    """Returns (message, how) where how is the model id or 'template'."""
    facts = [
        f"Student: {r['student_name']}",
        f"Achievement: {r['title']}",
    ]
    for label, key in (
        ("Category", "category"), ("Position", "position"),
        ("Event", "event_name"), ("Organiser", "organiser"),
        ("Location", "location"), ("Team members", "team_members"),
    ):
        if r.get(key):
            facts.append(f"{label}: {r[key]}")
    if r.get("prize_amount"):
        facts.append(f"Prize money: Rs. {int(r['prize_amount']):,}")
    if r.get("achieved_on"):
        facts.append(f"Date: {fmt_date(r['achieved_on'])}")
    if r.get("description"):
        facts.append(f"Details: {r['description']}")
    if r.get("student_year"):
        facts.append(f"Year of study: {r['student_year']}")
    if r.get("proof_url"):
        facts.append(f"Certificate/Photo link: {r['proof_url']}")

    prompt = (
        "Write a WhatsApp announcement congratulating this student on behalf of "
        "the department.\n\n" + "\n".join(facts)
    )

    try:
        text, model_id = chat(SYSTEM_PROMPT, prompt)
        if not looks_complete(text):
            raise RuntimeError("Response looked truncated (missing sign-off line)")
        # The certificate link is worth having even if the model dropped it.
        link = r.get("proof_url")
        if link and link not in text:
            text = f"{text}\n\nCertificate: {link}"
        text = add_emoji_flourish(text, "achievement")
        return text, model_id
    except Exception as e:
        print(f"[ai_compose] achievement fell back to template: {e}")
        return template_achievement(r), "template"


def compose_event(r: dict) -> tuple[str, str]:
    facts = [
        f"Event title: {r['title']}",
        f"Level: {'Institute level, open to the whole university' if r.get('scope') == 'institute' else 'CSE department level'}",
        f"Type: {(r.get('event_type') or 'event').replace('_', ' ')}",
        f"Starts: {fmt_date(r.get('starts_at'), True)}",
    ]
    for label, key in (
        ("Ends", "ends_at"), ("Venue", "venue"), ("Speaker", "speaker"),
        ("Organiser", "organiser"), ("Contact person", "contact_person"),
        ("Contact number", "contact_number"),
        ("Registration link", "registration_link"),
        ("Details", "description"),
    ):
        if r.get(key):
            value = fmt_date(r[key], True) if key == "ends_at" else r[key]
            facts.append(f"{label}: {value}")
    if r.get("max_participants"):
        facts.append(f"Seats: {r['max_participants']}")

    prompt = (
        "Write a WhatsApp announcement inviting students to this event. "
        "If a registration link is given, include it on its own line exactly as "
        "written.\n\n" + "\n".join(facts)
    )

    try:
        text, model_id = chat(SYSTEM_PROMPT, prompt)
        if not looks_complete(text):
            raise RuntimeError("Response looked truncated (missing sign-off line)")
        # The link is the point of the message, so make sure it survived.
        link = r.get("registration_link")
        if link and link not in text:
            text = f"{text}\n\nRegister: {link}"
        text = add_emoji_flourish(text, "event")
        return text, model_id
    except Exception as e:
        print(f"[ai_compose] event fell back to template: {e}")
        return template_event(r), "template"


# ----------------------------------------------------------------- WhatsApp

def share_link(message: str) -> str:
    """A wa.me link that opens WhatsApp with the message ready to send.

    WhatsApp's official Cloud API cannot post to groups — it sends only to
    individual numbers that have opted in. So the approved message opens in
    WhatsApp with the text pre-filled and the HOD picks the CSE groups. One
    tap, and it is the only route that does not violate WhatsApp's terms.
    """
    return "https://wa.me/?text=" + urllib.parse.quote(message)