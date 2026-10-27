"""Bundle the game into one self-contained HTML file (dist/build-it.html).

Usage:  python3 tools/bundle.py
Handy for emailing the game or hosting it anywhere that serves a single file.
For GitHub Pages you don't need this: just publish the repo root.
"""
from pathlib import Path

root = Path(__file__).resolve().parent.parent
css = (root / "css" / "styles.css").read_text()
scripts = "\n".join(
    f"<script>\n{(root / 'js' / name).read_text()}\n</script>"
    for name in ["data.js", "sim.js", "building.js", "ui.js"]
)
fonts = (
    "https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,500..900"
    "&family=Atkinson+Hyperlegible:wght@400;700&family=JetBrains+Mono:wght@400;600&display=swap"
)
html = f"""<title>Build It!</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="{fonts}">
<style>
{css}
</style>
<div id="app"></div>
{scripts}
"""
out = root / "dist" / "build-it.html"
out.parent.mkdir(exist_ok=True)
out.write_text(html)
print(f"Wrote {out} ({len(html):,} bytes)")
