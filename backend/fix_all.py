"""
fix_all.py — closes both gaps in one run.

  1. Rewrites prompt rule 3 so a refusal carries no Source line or [1] markers
  2. Adds the four missing entries to kb.json:
       HOD message, vision, mission, Sapna Malviya

    python fix_all.py
    python ingest_kb.py
    python diagnose.py
"""
import json
import re
from pathlib import Path

HERE = Path(__file__).parent

# ---------------------------------------------------------------- 1. prompt

engine = HERE / "rag_engine.py"
src = engine.read_text(encoding="utf-8")

NEW_RULE = ('3. When you DO answer, end with a line beginning "Source:" naming the '
            'document\n   titles you used. When you refuse, output ONLY the refusal '
            'sentence — no\n   Source line, no [1] [2] citation markers, nothing else.')

# Match whatever rule 3 currently says, up to the start of rule 4.
pattern = re.compile(r'3\. .*?(?=\n4\.)', re.S)
if pattern.search(src):
    src = pattern.sub(NEW_RULE, src, count=1)
    engine.write_text(src, encoding="utf-8")
    print("[1/2] prompt rule 3 rewritten — refusals will no longer cite sources")
else:
    print("[1/2] could not find rule 3 in rag_engine.py — check it by hand")

# ----------------------------------------------------------------- 2. kb.json

kb_path = HERE / "kb.json"
data = json.loads(kb_path.read_text(encoding="utf-8"))
items = data["chunks"] if isinstance(data, dict) and "chunks" in data else data

AUD = ["student", "faculty", "admin", "administrator"]
DEPT_SRC = "CSE Department Profile and Highlights, CSE-DEPT-2025-26"
FAC_SRC = "CSE Faculty Profiles, A.Y. 2024-2025"

NEW = [
    {
        "section": "department",
        "title": "Message from the Head of Department",
        "text": (
            "Message from the Head of Department, Dr. Mahendra B. Gawali, "
            "Department of Computer Science and Engineering, Sanjivani University. "
            "The 21st century is known as the technical era, and Computer Science is "
            "one of the core fields most impacted by this rapid transformation. "
            "Keeping these versatile needs in mind, Sanjivani University established "
            "the Department of Computer Science and Engineering in 2024. The "
            "department has highly qualified faculty members, fully digitally "
            "equipped classrooms, and state-of-the-art laboratories. It follows all "
            "rules and regulations laid down by NEP-2020, with flexibility to meet "
            "industry requirements and choice-based subject selection."
        ),
        "source": DEPT_SRC,
        "audience": AUD,
    },
    {
        "section": "department",
        "title": "Department Vision",
        "text": (
            "Vision of the Department of Computer Science and Engineering: "
            "To achieve global recognition in the field of computer science and "
            "engineering through an innovative curriculum and quality in Education, "
            "Research, Innovation and Entrepreneurship, producing effective leaders "
            "who serve societal challenges."
        ),
        "source": DEPT_SRC,
        "audience": AUD,
    },
    {
        "section": "department",
        "title": "Department Mission",
        "text": (
            "Mission of the Department of Computer Science and Engineering. "
            "First, to provide a platform for students to become industry ready "
            "technocrats as full stack developers, through a curriculum tailored to "
            "industry needs with a focus on complex problem-solving skills. "
            "Second, to impart high quality experiential learning in modern software "
            "tools and to meet the real-time requirements of industry. "
            "Third, to develop quality research, both national and international, "
            "enhancing learning through a strong research ecosystem. "
            "Fourth, to promote a supportive and positive community through "
            "initiatives that contribute to societal well-being and fulfil "
            "institutional social responsibility."
        ),
        "source": DEPT_SRC,
        "audience": AUD,
    },
    {
        "section": "faculty",
        "title": "Ms. Sapna Malviya",
        "text": (
            "Ms. Sapna Malviya — Assistant Professor, Department of Computer Science "
            "and Engineering, Sanjivani University. Employee ID 2101098T. "
            "Date of joining: 09 March 2026. Total experience: 4 years, comprising "
            "2 years in education and 2 years in industry. Academic record: "
            "UG 8.90 CGPA, PG 8.72 CGPA. Publications and outcomes: one book "
            "published and one patent published."
        ),
        "source": FAC_SRC,
        "audience": AUD,
    },
]

existing_titles = {i.get("title", "") for i in items}
added = []
for entry in NEW:
    # Skip anything already present, so re-running is safe.
    marker = entry["text"][:60].lower()
    if entry["title"] in existing_titles or any(marker in i.get("text", "").lower() for i in items):
        continue
    items.append(entry)
    added.append(entry["title"])

if isinstance(data, dict) and "chunks" in data:
    data["chunks"] = items
else:
    data = items

kb_path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")

print(f"[2/2] kb.json now has {len(items)} entries")
for t in added:
    print(f"        added: {t}")
if not added:
    print("        nothing added — all four were already present")

print("\nNext:")
print("    python ingest_kb.py")
print("    python diagnose.py")
