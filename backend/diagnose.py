"""
diagnose.py — what is actually in the knowledge base, and what a student can see.

    python diagnose.py
"""
import env_loader, os, psycopg2, psycopg2.extras

conn = psycopg2.connect(os.environ["DATABASE_URL"])
cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

print("=" * 74)
print("DOCUMENTS AND AUDIENCE FLAGS")
print("=" * 74)
cur.execute("""SELECT d.id, d.title, d.section, d.aud_student, d.aud_faculty,
                      d.aud_admin, count(c.id) AS chunks
               FROM kb_documents d LEFT JOIN kb_chunks c ON c.document_id = d.id
               GROUP BY d.id ORDER BY d.id""")
rows = cur.fetchall()
if not rows:
    print("  *** kb_documents is EMPTY — run: python ingest_kb.py ***")
for r in rows:
    flag = lambda b: "yes" if b else "NO "
    print(f"  [{r['section']:14s}] {r['title'][:40]:42s} chunks={r['chunks']:3d}  "
          f"student={flag(r['aud_student'])} faculty={flag(r['aud_faculty'])} admin={flag(r['aud_admin'])}")

blind = [r for r in rows if not r["aud_student"]]
if blind:
    print("\n  *** students cannot see these documents: "
          f"{[r['title'][:34] for r in blind]} ***")
    print("  Fix with:  UPDATE kb_documents SET aud_student=TRUE;")

print()
print("=" * 74)
print("IS THE CONTENT THERE AT ALL?  (literal search across every chunk)")
print("=" * 74)
TERMS = [
    ("HOD message / welcome", ["21st century", "technical era", "Welcome"]),
    ("HOD name",              ["Gawali"]),
    ("faculty: Chopde",       ["Chopde"]),
    ("faculty: Bramhane",     ["Bramhane"]),
    ("faculty: Kalita",       ["Kalita"]),
    ("faculty: Malviya",      ["Malviya"]),
    ("vision",                ["global recognition"]),
    ("mission",               ["full stack developer", "industry ready"]),
    ("labs",                  ["Computer Vision Laboratory"]),
    ("placements",            ["10 LPA", "Techotlist"]),
]
missing = []
for label, needles in TERMS:
    cond = " OR ".join(["c.chunk_text ILIKE %s"] * len(needles))
    cur.execute(f"""SELECT count(*) n FROM kb_chunks c WHERE {cond}""",
                tuple(f"%{x}%" for x in needles))
    n = cur.fetchone()["n"]
    print(f"  {label:24s} {'found in ' + str(n) + ' chunk(s)' if n else '*** NOT IN THE KNOWLEDGE BASE ***'}")
    if not n:
        missing.append(label)

print()
print("=" * 74)
print("WHAT A STUDENT ACTUALLY RETRIEVES")
print("=" * 74)
import rag_engine
for q in ["what is the message from the HOD",
          "who is the HOD",
          "tell me about the faculty",
          "who is Nitin Chopde"]:
    hits = rag_engine.retrieve(q, "student")
    print(f"\n  Q: {q}")
    if not hits:
        print("     *** nothing retrieved — check audience flags above ***")
    for h in hits[:3]:
        print(f"     [{h['section']:14s}] {h['chunk_text'][:62].strip()}...")

print()
print("=" * 74)
if missing:
    print("VERDICT: the assistant is behaving correctly. This content is simply")
    print("not in the knowledge base:")
    for m in missing:
        print(f"   - {m}")
    print("\nAdd it to kb.json and re-run:  python ingest_kb.py")
else:
    print("VERDICT: all content is present. If the assistant still refuses, the")
    print("retrieved chunks above show what the model was given.")
conn.close()