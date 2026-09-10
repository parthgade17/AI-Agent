"""
test_key_rotation.py
---------------------
Exercises the REAL key-rotation logic in rag_engine.py, with Groq's HTTP
calls mocked out — no real network traffic, no real API cost, no DB writes.

Run from backend/, same as quick_test.py:
    python test_key_rotation.py

What it proves, against your actual code (not a re-implementation of it):
  1. With multiple keys configured, a 429 on one key rotates to the next
     key immediately (no sleep) instead of stalling.
  2. A 401 (bad/revoked key) also rotates immediately.
  3. If every key is exhausted, it raises a clear RuntimeError rather than
     hanging or crashing with a raw traceback.
  4. With only one key configured (the original setup), behaviour is
     unchanged: it still retries the same key with backoff.
"""
import os
import sys
from unittest.mock import MagicMock, patch

# Fake keys and a forced model so this never needs a real network call to
# list models. Set BEFORE importing rag_engine, since it reads env at
# import time for the key pool.
os.environ["GROQ_API_KEY"] = "test_key_1"
os.environ["GROQ_API_KEY_2"] = "test_key_2"
os.environ["GROQ_API_KEY_3"] = "test_key_3"
os.environ["GROQ_MODEL"] = "openai/gpt-oss-120b"
os.environ["LLM_PROVIDER"] = "groq"
os.environ.setdefault("DATABASE_URL", "postgresql://unused:unused@localhost/unused")

import rag_engine  # noqa: E402  (must come after the env vars above)


def fake_response(status_code: int, content: str = "ok", retry_after: str | None = None):
    r = MagicMock()
    r.status_code = status_code
    r.headers = {"Retry-After": retry_after} if retry_after else {}
    r.json.return_value = {"choices": [{"message": {"content": content}}]}
    if status_code >= 400:
        r.raise_for_status.side_effect = Exception(f"HTTP {status_code}")
    else:
        r.raise_for_status.side_effect = None
    return r


def reset_key_pool(keys):
    rag_engine._GROQ_KEYS = keys
    rag_engine._key_index = 0


def test_rotates_past_rate_limited_keys():
    print("Test 1: 429 on keys 1 and 2, success on key 3...")
    reset_key_pool(["k1", "k2", "k3"])

    responses = {"k1": fake_response(429), "k2": fake_response(429), "k3": fake_response(200, "The answer.")}

    def fake_post(url, headers, json, timeout):
        key = headers["Authorization"].split()[-1]
        return responses[key]

    with patch("rag_engine.requests.post", side_effect=fake_post), \
         patch("rag_engine.time.sleep") as sleep_mock:
        answer, model = rag_engine.call_llm("question", "context")

    assert answer == "The answer.", f"expected success text, got: {answer!r}"
    sleep_mock.assert_not_called()  # rotation should never sleep with keys available
    print("  PASS — rotated past both 429s, no sleep called.\n")


def test_rotates_past_unauthorized_key():
    print("Test 2: 401 on key 1, success on key 2...")
    reset_key_pool(["bad_key", "good_key"])

    responses = {"bad_key": fake_response(401), "good_key": fake_response(200, "Fine.")}

    def fake_post(url, headers, json, timeout):
        key = headers["Authorization"].split()[-1]
        return responses[key]

    with patch("rag_engine.requests.post", side_effect=fake_post), \
         patch("rag_engine.time.sleep") as sleep_mock:
        answer, model = rag_engine.call_llm("question", "context")

    assert answer == "Fine."
    sleep_mock.assert_not_called()
    print("  PASS — rotated past the bad key without stopping.\n")


def test_raises_clean_error_when_all_keys_exhausted():
    print("Test 3: every key rate-limited, should raise a clear RuntimeError...")
    reset_key_pool(["k1", "k2"])

    with patch("rag_engine.requests.post", return_value=fake_response(429, retry_after="3")), \
         patch("rag_engine.time.sleep"):
        try:
            rag_engine.call_llm("question", "context")
            raise AssertionError("expected a RuntimeError, got a normal return")
        except RuntimeError as e:
            assert "rate-limited" in str(e).lower()
            print(f"  PASS — raised RuntimeError: {e}\n")


def test_single_key_still_uses_backoff():
    print("Test 4: only one key configured — old sleep-and-retry behaviour...")
    reset_key_pool(["only_key"])

    call_count = {"n": 0}

    def fake_post(url, headers, json, timeout):
        call_count["n"] += 1
        if call_count["n"] < 2:
            return fake_response(429, retry_after="1")
        return fake_response(200, "Recovered.")

    with patch("rag_engine.requests.post", side_effect=fake_post), \
         patch("rag_engine.time.sleep") as sleep_mock:
        answer, model = rag_engine.call_llm("question", "context")

    assert answer == "Recovered."
    sleep_mock.assert_called()  # with only one key, it must wait rather than rotate
    print("  PASS — single-key setup still waits and retries as before.\n")


if __name__ == "__main__":
    tests = [
        test_rotates_past_rate_limited_keys,
        test_rotates_past_unauthorized_key,
        test_raises_clean_error_when_all_keys_exhausted,
        test_single_key_still_uses_backoff,
    ]
    failed = 0
    for t in tests:
        try:
            t()
        except Exception as e:
            failed += 1
            print(f"  FAIL — {t.__name__}: {e}\n")

    print("=" * 60)
    if failed:
        print(f"{len(tests) - failed} passed, {failed} failed")
        sys.exit(1)
    else:
        print(f"All {len(tests)} tests passed — key rotation logic is working correctly.")
