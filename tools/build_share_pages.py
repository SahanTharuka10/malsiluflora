"""Builds b/<code>.html: one small page per bouquet for WhatsApp links.

WhatsApp reads the page's preview tags to show the bouquet photo, name and
price under the order message; a person who taps the link is sent straight
to the website with that bouquet open.

Run after changing data.js:   python tools/build_share_pages.py
"""
import html, json, os, re, shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "b")


def load_js_value(path, pattern):
    src = open(os.path.join(ROOT, path), encoding="utf8").read()
    m = re.search(pattern, src)
    return src, m


src, _ = load_js_value("data.js", "")
bouquets = json.loads(src[src.index("["):src.rindex("]") + 1])
_, m = load_js_value("config.js", r'siteUrl:\s*"([^"]*)"')
site = (m.group(1) if m else "").rstrip("/")
if not site:
    raise SystemExit("Set siteUrl in config.js first (e.g. https://malsiluflora.vercel.app)")
cats_src, _ = load_js_value("categories.js", "")
cats = dict(re.findall(r'id:\s*"([^"]+)",\s*name:\s*"([^"]+)"', cats_src))


def price_text(p):
    m = re.match(r"^([\d,]+)\s*(.*)$", p)
    if not m:
        return "Price on request"
    return f"LKR {m.group(1)}" + (f" {m.group(2)}" if m.group(2) else "")


PAGE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta property="og:type" content="product">
<meta property="og:site_name" content="Malsilu Flora">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{page}">
<meta property="og:image" content="{image}">
<meta property="og:image:secure_url" content="{image}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="700">
<meta property="og:image:height" content="1000">
<meta property="og:image:alt" content="{name}">
<meta name="twitter:card" content="summary_large_image">
<script>location.replace({target_js});</script>
<style>body{{margin:0;min-height:100vh;display:grid;place-items:center;background:#fbf7f2;color:#2a1d24;font:16px/1.5 system-ui,sans-serif;text-align:center}}img{{width:220px;border-radius:110px 110px 12px 12px;display:block;margin:0 auto 16px}}a{{color:#6e2a4f}}</style>
</head>
<body>
<p><img src="{image}" alt="{name}"><b>{code} · {name}</b><br>{price}<br><a href="{target}">View on Malsilu Flora</a></p>
</body>
</html>
"""

if os.path.isdir(OUT):
    shutil.rmtree(OUT)
os.makedirs(OUT)
for b in bouquets:
    code = b["code"]
    target = f"{site}/?b={code}"
    price = price_text(b["price"])
    e = lambda s: html.escape(s, quote=True)
    page = PAGE.format(
        title=e(f"{code} · {b['name']} · Malsilu Flora"),
        name=e(b["name"]),
        code=e(code),
        desc=e(f"{price} · {cats.get(b['cat'], '')}. {b['desc']}".strip()),
        price=e(price),
        page=e(f"{site}/b/{code.lower()}.html"),
        image=e(f"{site}/{b['img']}"),
        target=e(target),
        target_js=json.dumps(target),
    )
    open(os.path.join(OUT, f"{code.lower()}.html"), "w", encoding="utf8", newline="\n").write(page)
print(f"Wrote {len(bouquets)} share pages to b/ for {site}")

# one page per category: c/<id>.html opens the gallery on that category
COUT = os.path.join(ROOT, "c")
if os.path.isdir(COUT):
    shutil.rmtree(COUT)
os.makedirs(COUT)
links = []
for line in cats_src.splitlines():
    m = re.search(r'id:\s*"([^"]+)",\s*name:\s*"([^"]+)"', line)
    if not m:
        continue
    cid, cname = m.groups()
    items = [b for b in bouquets if b["cat"] == cid]
    if not items:
        continue
    cover = re.search(r'cover:\s*"([^"]+)"', line)
    first = next((b for b in items if cover and b["code"] == cover.group(1)), items[0])
    blurb = re.search(r'blurb:\s*"([^"]+)"', line)
    target = f"{site}/?c={cid}"
    e = lambda s: html.escape(s, quote=True)
    page = PAGE.format(
        title=e(f"{cname} · Malsilu Flora"),
        name=e(cname),
        code=e(f"{len(items)} designs"),
        desc=e(f"{len(items)} designs. {blurb.group(1) if blurb else ''} Order on WhatsApp.".strip()),
        price=e("Malsilu Flora · Kiribathgoda"),
        page=e(f"{site}/c/{cid}.html"),
        image=e(f"{site}/{first['img']}"),
        target=e(target),
        target_js=json.dumps(target),
    )
    open(os.path.join(COUT, f"{cid}.html"), "w", encoding="utf8", newline="\n").write(page)
    links.append((cname, len(items), f"{site}/c/{cid}.html"))
print(f"Wrote {len(links)} category pages to c/")
for name, n, url in links:
    print(f"  {name} ({n}): {url}")
