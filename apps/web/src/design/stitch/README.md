# Stitch → repo import (Parinator)

Source: **Google Stitch** project `Parinator` (`projectId` **14452944700689366656**).

## What is here

| Path | Purpose |
|------|---------|
| `manifest.json` | Screen IDs, titles, device type, dimensions, and relative paths to exported `.html` / `.png` |
| `screens/` | Static HTML + PNG preview per Stitch screen (reference / handoff, not wired into Next.js) |
| `design-spec-parinator-tactical.md` | Design system narrative for **Parinator Tactical** |
| `design-spec-bauhaus.md` | Design system narrative for **Bauhaus** variant |

## Refreshing exports

Stitch download URLs in API responses **expire**. To re-pull assets:

1. Call MCP tool `list_screens` with `projectId` `14452944700689366656` and save the JSON to e.g. `scripts/stitch_parinator_list_screens.json`.
2. Run:

```bash
python3 scripts/download-stitch-parinator.py scripts/stitch_parinator_list_screens.json
```

The script uses `curl` (Python `urllib` may fail SSL verification on some macOS Python builds).

3. Update the `design-spec-*.md` files manually if the narrative changed in Stitch, or re-copy from `list_design_systems` MCP output.

## HTML previews

Open any file under `screens/*.html` in a browser for a pixel reference. Fonts may load from Google Fonts as in the original Stitch export.
