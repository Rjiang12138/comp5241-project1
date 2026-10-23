#!/usr/bin/env python3
"""Convert a static prototype page into a Next.js page component.

The prototype in ../prototype is the visual source of truth. This script exists
so the port is mechanical: it copies markup verbatim, rewrites only what JSX
requires (class -> className, style strings -> objects, SVG attribute casing,
void elements, .html links -> routes). Nothing is redesigned.

Usage:
    python tools/html_to_tsx.py prototype/studio.html app/studio/page.tsx
"""

import re
import sys
from pathlib import Path

ROUTES = {
    "index.html": "/",
    "studio.html": "/studio",
    "course.html": "/courses",
    "learn.html": "/learn",
    "analytics.html": "/insights",
    "path.html": "/path",
}

# Attributes JSX spells differently. Everything not listed is passed through.
ATTR_CASE = {
    "class": "className",
    "for": "htmlFor",
    "stroke-width": "strokeWidth",
    "stroke-linecap": "strokeLinecap",
    "stroke-linejoin": "strokeLinejoin",
    "stroke-dasharray": "strokeDasharray",
    "stroke-opacity": "strokeOpacity",
    "fill-rule": "fillRule",
    "clip-rule": "clipRule",
    "fill-opacity": "fillOpacity",
    "font-size": "fontSize",
    "font-family": "fontFamily",
    "font-weight": "fontWeight",
    "text-anchor": "textAnchor",
    "dominant-baseline": "dominantBaseline",
    "stop-color": "stopColor",
    "stop-opacity": "stopOpacity",
    "xlink:href": "xlinkHref",
}

VOID = {"br", "img", "hr", "input", "meta", "link", "source", "area", "base", "col", "embed", "param", "track", "wbr"}

TAG_RE = re.compile(r"<(/?)([a-zA-Z][\w:-]*)((?:\s+[^<>]*?)?)(/?)>", re.S)
ATTR_RE = re.compile(r'([\w:-]+)(?:\s*=\s*"([^"]*)")?')


def camel(name: str) -> str:
    return re.sub(r"-([a-z])", lambda m: m.group(1).upper(), name)


def style_to_object(value: str) -> str:
    decls = []
    for part in value.split(";"):
        part = part.strip()
        if not part or ":" not in part:
            continue
        key, val = part.split(":", 1)
        decls.append(f"{camel(key.strip())}: '{val.strip()}'")
    return "{{ " + ", ".join(decls) + " }}"


def convert_attrs(blob: str) -> str:
    out = []

    def repl(m):
        name, value = m.group(1), m.group(2)
        if value is None:
            return name
        if name == "style":
            return f"style={style_to_object(value)}"
        if name == "href" and value in ROUTES:
            return f'href="{ROUTES[value]}"'
        if name == "href" and value.startswith("../"):
            return 'href="#"'
        name = ATTR_CASE.get(name, name)
        return f'{name}="{value}"'

    for token in ATTR_RE.finditer(blob):
        if not token.group(0).strip():
            continue
        out.append(repl(token))
    return (" " + " ".join(out)) if out else ""


def convert_tag(m) -> str:
    closing, name, blob, selfclose = m.group(1), m.group(2), m.group(3), m.group(4)
    if closing:
        return f"</{name}>"
    attrs = convert_attrs(blob) if blob else ""
    if name.lower() in VOID or selfclose:
        return f"<{name}{attrs} />"
    return f"<{name}{attrs}>"


def body_of(html: str) -> str:
    html = re.sub(r"<!--.*?-->", "", html, flags=re.S)
    html = re.sub(r"<script\b.*?</script>", "", html, flags=re.S | re.I)
    m = re.search(r"<body[^>]*>(.*)</body>", html, flags=re.S | re.I)
    return m.group(1) if m else html


# The prototype hard-coded the signed-in user in the sidebar because it had no
# session. Ported verbatim, that copy contradicts the real session the moment
# someone signs in as anyone else, so it is swapped for a component that reads
# the session instead.
SIDE_USER_RE = re.compile(r'<a className="side-user" href="#">.*?</a>', re.S)

# Two sidebar items the prototype left broken: "Cohorts" pointed at course.html
# (the catalogue, so it opened nothing) and "Settings" was a bare "#". Both are
# rewritten to route expressions. `(?:(?!</a>).)*?` keeps the match inside a
# single anchor tag.
COHORTS_RE = re.compile(r'<a href="/courses">((?:(?!</a>).)*?Cohorts(?:(?!</a>).)*?)</a>', re.S)
SETTINGS_RE = re.compile(r'<a href="#">((?:(?!</a>).)*?Settings(?:(?!</a>).)*?)</a>', re.S)


def escape_braces(text: str) -> str:
    """JSX treats a bare { or } in text as an expression.

    The prototype's code samples are full of braces, so every brace outside a
    tag has to become a literal expression. Braces inside a tag are ours
    (style objects) and must be left alone.
    """
    out = []
    in_tag = False
    for ch in text:
        if ch == "<":
            in_tag = True
        elif ch == ">":
            in_tag = False
        if not in_tag and ch in "{}":
            out.append('{"' + ch + '"}')
        else:
            out.append(ch)
    return "".join(out)


def convert(src: Path) -> str:
    body = body_of(src.read_text(encoding="utf-8"))
    body = TAG_RE.sub(convert_tag, body)
    body = escape_braces(body)
    body = SIDE_USER_RE.sub("<SideUser session={session} />", body, count=1)
    # Runs after escape_braces on purpose: the braces introduced here live inside
    # a tag, which escape_braces leaves alone anyway, but keeping the order makes
    # it impossible for them to be doubled.
    body = COHORTS_RE.sub(r'<a href={cohortsHref(session)}>\1</a>', body)
    body = SETTINGS_RE.sub(r'<a href="/settings">\1</a>', body)
    # The player's exit button said "Back to course" and pointed at course.html,
    # which the route map sends to the catalogue. A learner leaving the player
    # expects the course they were in, so this one link is resolved to the course.
    if src.name == "learn.html":
        body = body.replace('href="/courses" title="Back to course"', 'href="/courses/c-sef" title="Back to course"')
    lines = [ln.rstrip() for ln in body.strip().splitlines()]
    body = "\n".join(lines)
    return body


def wrap(jsx: str, name: str, note: str) -> str:
    header = f"// Generated from prototype/{Path(note).name} by tools/html_to_tsx.py.\n"
    header += "// Markup is copied verbatim from the mid-term prototype. Do not restyle here:\n"
    header += "// change prototype/css/styles.css and re-run the converter instead.\n\n"

    # A screen that shows the sidebar footer needs the real session, not the
    # name the prototype happened to have open. The Cohorts link needs it too,
    # because where it goes depends on the role.
    if "<SideUser" in jsx:
        header += 'import SideUser from "@/components/SideUser";\n'
    if "cohortsHref(" in jsx:
        header += 'import { cohortsHref } from "@/lib/nav";\n'

    if "<SideUser" in jsx or "cohortsHref(" in jsx:
        header += 'import type { Session } from "@/lib/auth";\n\n'
        signature = "{ session }: { session: Session }"
    else:
        signature = ""

    body = "\n".join("      " + ln if ln.strip() else "" for ln in jsx.splitlines())
    return f"{header}export default function {name}({signature}) {{\n  return (\n    <>\n{body}\n    </>\n  );\n}}\n"


def main() -> int:
    if len(sys.argv) < 3:
        print(__doc__)
        return 1
    src, dst = Path(sys.argv[1]), Path(sys.argv[2])
    name = sys.argv[3] if len(sys.argv) > 3 else "".join(p.capitalize() for p in src.stem.split("_")) + "Screen"
    jsx = wrap(convert(src), name, src.name)
    dst.parent.mkdir(parents=True, exist_ok=True)
    dst.write_text(jsx, encoding="utf-8")
    print(f"{src} -> {dst} ({len(jsx.splitlines())} lines)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
