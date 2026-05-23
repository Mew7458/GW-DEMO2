from pathlib import Path
import re

p = Path('Zai-Battle-script.js')
orig = p.read_text(encoding='utf-8', errors='replace')
lines = orig.splitlines(True)

changed = 0
out = []

for line in lines:
    before = line

    # Fix opponent checks that were hardcoded to 'enemy'
    if "tu.side!=='enemy'" in line:
        # In skill factories, actor variable is often named 'uu'
        if re.search(r"\buu\b", line):
            line = line.replace("tu.side!=='enemy'", "tu.side!==uu.side")
        else:
            line = line.replace("tu.side!=='enemy'", "tu.side!==u.side")

    if "occ.side!=='enemy'" in line:
        line = line.replace("occ.side!=='enemy'", "occ.side!==u.side")

    # Fix two places that rejected enemy instead of rejecting allies
    if "if(!tu || tu.side==='enemy')" in line:
        line = line.replace("if(!tu || tu.side==='enemy')", "if(!tu || tu.side===u.side)")
    if "if(!tu || tu.side==='enemy'){" in line:
        line = line.replace("if(!tu || tu.side==='enemy'){", "if(!tu || tu.side===u.side){")

    if line != before:
        changed += 1

    out.append(line)

new_text = ''.join(out)
if new_text != orig:
    p.write_text(new_text, encoding='utf-8')

print(f"Patched lines: {changed}")
