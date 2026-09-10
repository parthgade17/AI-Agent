"""
env_loader.py
-------------
Reads .env regardless of how Windows wrote it.

python-dotenv assumes UTF-8. PowerShell's Set-Content and Out-File often
produce UTF-16LE, and a here-string written the wrong way leaves literal
@" and "@ lines in the file. Either makes dotenv skip every line and report
"could not parse statement", after which nothing is configured and the real
error surfaces somewhere confusing.

This decodes UTF-8, UTF-16 and Latin-1, strips BOMs and shell wrapper lines,
and sets os.environ itself. Import it before reading any variable.
"""

import os
from pathlib import Path

WRAPPER_JUNK = ('@"', '"@', "@'", "'@")


def load_env(path: str | os.PathLike = ".env", override: bool = False) -> dict:
    """Parse .env and put its keys into os.environ. Returns what it loaded."""
    p = Path(path)
    if not p.is_file():
        p = Path(__file__).with_name(".env")
    if not p.is_file():
        print(f"[env_loader] no .env found at {Path(path).resolve()}")
        return {}

    raw = p.read_bytes()

    # UTF-16 without a BOM still shows as NUL bytes between characters.
    if raw[:2] in (b"\xff\xfe", b"\xfe\xff") or raw.count(b"\x00") > len(raw) // 4:
        encodings = ("utf-16", "utf-16-le", "utf-16-be", "utf-8-sig", "utf-8")
    else:
        encodings = ("utf-8-sig", "utf-8", "utf-16", "latin-1")

    text = None
    for enc in encodings:
        try:
            text = raw.decode(enc)
            break
        except (UnicodeDecodeError, UnicodeError):
            continue
    if text is None:
        print(f"[env_loader] could not decode {p}")
        return {}

    text = text.lstrip("\ufeff")

    loaded, skipped, duplicates = {}, [], {}
    for lineno, line in enumerate(text.splitlines(), 1):
        line = line.strip().lstrip("\ufeff")

        if not line or line.startswith("#"):
            continue
        # Shell here-string leftovers and pipeline fragments.
        if line in WRAPPER_JUNK or line.startswith(WRAPPER_JUNK) or "|Set-Content" in line:
            skipped.append(lineno)
            continue
        if line.lower().startswith("export "):
            line = line[7:].strip()
        if "=" not in line:
            skipped.append(lineno)
            continue

        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")

        if not key or not key.replace("_", "").isalnum():
            skipped.append(lineno)
            continue

        # Later lines win, which is how .env files are expected to behave.
        # The previous version kept the first occurrence, so a stale key left
        # above a working one silently took precedence.
        if key in loaded:
            duplicates.setdefault(key, []).append(lineno)
        loaded[key] = value

    # Apply once, after the whole file is read, so the last value wins.
    for key, value in loaded.items():
        if override or key not in os.environ or os.environ.get(key) != value:
            os.environ[key] = value

    if skipped:
        print(f"[env_loader] ignored non-variable line(s): {skipped}")
    for key, lines in duplicates.items():
        print(f"[env_loader] WARNING: {key} appears more than once "
              f"(also on line(s) {lines}) — the LAST one is used. "
              f"Delete the others to avoid confusion.")
    if loaded:
        shown = ", ".join(
            f"{k}=***" if any(s in k.upper() for s in ("KEY", "PASSWORD", "SECRET", "TOKEN"))
            else f"{k}={v[:38]}"
            for k, v in loaded.items()
        )
        print(f"[env_loader] loaded from {p.name}: {shown}")
    else:
        print(f"[env_loader] {p} contained no usable KEY=VALUE lines")

    return loaded


load_env()