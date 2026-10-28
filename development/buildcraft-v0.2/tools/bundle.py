"""Bundle this iteration into one self-contained HTML file (dist/buildcraft.html).

Usage:  python3 tools/bundle.py   (run from this iteration's folder)
For GitHub Pages you don't need this: the folder runs as-is.
"""
from pathlib import Path

root = Path(__file__).resolve().parent.parent
css = (root / "css" / "styles.css").read_text()
scripts = "\n".join(
    f"<script>\n{(root / 'js' / name).read_text()}\n</script>"
    for name in ["data.js", "sim.js", "art.js", "fx.js", "ui.js"]
)
fonts = "https://fonts.googleapis.com/css2?family=Lilita+One&family=Lexend:wght@400;700&display=swap"
html = f"""<title>BuildCraft</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="{fonts}">
<style>
{css}
</style>
<div id="app"></div>
{scripts}
"""
out = root / "dist" / "buildcraft.html"
out.parent.mkdir(exist_ok=True)
out.write_text(html)
print(f"Wrote {out} ({len(html):,} bytes)")
