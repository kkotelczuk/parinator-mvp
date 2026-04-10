#!/usr/bin/env python3
"""Download Stitch Parinator screens (HTML + PNG) into apps/web/src/design/stitch/screens/.

Expects path to JSON file with same shape as MCP list_screens response: {"screens":[...]}.
Usage: python3 scripts/download-stitch-parinator.py path/to/list_screens.json
"""

from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "apps/web/src/design/stitch/screens"
MANIFEST_PATH = ROOT / "apps/web/src/design/stitch/manifest.json"


def slug_title(title: str, fallback: str) -> str:
    s = re.sub(r"[^a-zA-Z0-9]+", "-", (title or "").lower()).strip("-")
    return (s[:80] if s else fallback) or fallback


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: download-stitch-parinator.py <list_screens.json>", file=sys.stderr)
        return 1
    data = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    screens = data.get("screens") or []
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    manifest: dict = {
        "source": "Google Stitch",
        "projectId": "14452944700689366656",
        "projectTitle": "Parinator",
        "importedAt": None,
        "screens": [],
    }

    from datetime import datetime, timezone

    manifest["importedAt"] = datetime.now(timezone.utc).isoformat()

    def curl_download(url: str, dest: Path) -> None:
        dest.parent.mkdir(parents=True, exist_ok=True)
        subprocess.run(
            [
                "curl",
                "-fsSL",
                "-A",
                "parinator-poc-stitch-import/1.0",
                "-o",
                str(dest),
                url,
            ],
            check=True,
        )

    for s in screens:
        name = s.get("name") or ""
        screen_id = name.split("/screens/")[-1] if "/screens/" in name else name
        title = s.get("title") or screen_id
        base = f"{screen_id}__{slug_title(title, screen_id)}"
        row: dict = {
            "id": screen_id,
            "title": title,
            "deviceType": s.get("deviceType"),
            "width": s.get("width"),
            "height": s.get("height"),
            "htmlFile": None,
            "pngFile": None,
        }

        html = (s.get("htmlCode") or {}).get("downloadUrl")
        if html:
            path = OUT_DIR / f"{base}.html"
            try:
                curl_download(html, path)
                row["htmlFile"] = f"screens/{path.name}"
            except Exception as e:  # noqa: BLE001
                print(f"WARN html {screen_id}: {e}", file=sys.stderr)

        png = (s.get("screenshot") or {}).get("downloadUrl")
        if png:
            path = OUT_DIR / f"{base}.png"
            try:
                curl_download(png, path)
                row["pngFile"] = f"screens/{path.name}"
            except Exception as e:  # noqa: BLE001
                print(f"WARN png {screen_id}: {e}", file=sys.stderr)

        manifest["screens"].append(row)

    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"Wrote {MANIFEST_PATH} and {len(manifest['screens'])} screen assets under {OUT_DIR}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
