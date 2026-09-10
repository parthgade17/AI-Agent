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

import urllib.parse
from datetime import datetime
from typing import Any

import requests

import rag_engine

TIMEOUT = 40
MAX_TOKENS = 400

SYSTEM_PROMPT = """You write short WhatsApp announcements for the Department of \
Computer Science and Engineering, Sanjivani University, Kopargaon.

Rules:
1. Use ONLY the facts given. Never invent a name, date, prize, venue or link.
2. Plain text for WhatsApp. No markdown, no asterisks, no hashtags, no emoji.
3. Six lines or fewer. Short sentences.
4. Warm but professional. This is an official department message, not marketing.
5. End with exactly this line:
   Department of Computer Science and Engineering, Sanjivani University
6. Output the message only. No preamble, no explanation, no quotation marks.
"""


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
    line = " ".join(bits) + "."

    prize = f"\nPrize: Rs. {int(r['prize_amount']):,}" if r.get("prize_amount") else ""
    return (
        f"CSE Student Achievement\n\n{line}{prize}\n\n"
        f"We are proud of this achievement and wish continued success.\n\n"
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

    prompt = (
        "Write a WhatsApp announcement congratulating this student on behalf of "
        "the department.\n\n" + "\n".join(facts)
    )

    try:
        text, model_id = chat(SYSTEM_PROMPT, prompt)
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
        # The link is the point of the message, so make sure it survived.
        link = r.get("registration_link")
        if link and link not in text:
            text = f"{text}\n\nRegister: {link}"
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
