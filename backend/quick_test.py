"""
quick_test.py
-------------
Sanity check after ingestion. No FastAPI server needed.

    python quick_test.py
"""
import rag_engine

TEST_USER_ID = 1          # a real users.id — ai_conversations.user_id is NOT NULL

QUESTIONS = [
    ("which lab has GPU workstations", "student", True),
    ("who is the HOD and his research area", "student", True),
    ("which students got SAP certification", "student", True),
    ("who is Dr. Nitin Chopde", "student", True),
    ("how many papers has Nitin Chopde published", "student", True),
    ("what are the Goethe Zertifikat scores", "student", True),
    ("what is the highest placement package", "student", True),
    ("what is today's canteen menu", "student", False),   # must refuse
    ("what is the fee structure", "student", False),      # must refuse
]

if __name__ == "__main__":
    passed = failed = 0
    conv = None

    for q, role, expect_grounded in QUESTIONS:
        r = rag_engine.generate_answer(q, role=role, user_id=TEST_USER_ID,
                                       conversation_id=conv)
        conv = r["conversation_id"]
        ok = r["grounded"] == expect_grounded
        passed, failed = (passed + 1, failed) if ok else (passed, failed + 1)

        print("=" * 72)
        print(f"[{'PASS' if ok else 'FAIL'}] {q}")
        print(f"  {r['answer']}")
        print(f"  grounded={r['grounded']} (expected {expect_grounded}) · "
              f"retrieved={r['retrieved']} · {r['latency_ms']}ms · {r['model']}")
        if r["sources"]:
            for s in r["sources"]:
                print(f"    source: {s}")

    print("=" * 72)
    print(f"{passed} passed, {failed} failed out of {len(QUESTIONS)}")
    print("\nThe two refusal questions must say the assistant has no record of it.")
    print("A refusal is correct behaviour, not a bug — it is what stops the")
    print("assistant inventing answers, and it is worth showing to the judges.")