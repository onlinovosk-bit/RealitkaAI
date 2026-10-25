#!/usr/bin/env python3
"""Vyrobí .xlsx fixtures pre xlsx-parse.test.ts.

Zámerne NIE tým istým kódom, ktorý ich číta: kontajner skladá Pythonov
`zipfile` (DEFLATE), čítač je `node:zlib`. Keby bol producent aj konzument
ten istý kód, test by meral parser voči sebe.

Spustenie:  python3 make-xlsx-fixtures.py
"""
import os
import zipfile

HERE = os.path.dirname(os.path.abspath(__file__))

CONTENT_TYPES = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>"""

ROOT_RELS = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>"""

# numFmtId 14 = vstavaný dátum (d/m/yyyy); 164 = vlastný dátumový formát.
STYLES = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="1"><numFmt numFmtId="164" formatCode="dd\\.mm\\.yyyy"/></numFmts>
<cellXfs count="4">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
<xf numFmtId="14" fontId="0" fillId="0" borderId="0" applyNumberFormat="1"/>
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" applyNumberFormat="1"/>
<xf numFmtId="4" fontId="0" fillId="0" borderId="0" applyNumberFormat="1"/>
</cellXfs>
</styleSheet>"""


def workbook(sheets):
    parts = "".join(
        '<sheet name="%s" sheetId="%d" r:id="rId%d"%s/>'
        % (name, i + 1, i + 1, ' state="hidden"' if hidden else "")
        for i, (name, hidden) in enumerate(sheets)
    )
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
        "<sheets>%s</sheets></workbook>" % parts
    )


def workbook_rels(count):
    parts = "".join(
        '<Relationship Id="rId%d" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet%d.xml"/>'
        % (i + 1, i + 1)
        for i in range(count)
    )
    shared = (
        '<Relationship Id="rIdShared" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>'
        '<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
    )
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">%s%s</Relationships>'
        % (parts, shared)
    )


def shared_strings(items):
    body = ""
    for item in items:
        if isinstance(item, list):  # rich text: viac <r><t> za sebou
            runs = "".join("<r><t>%s</t></r>" % part for part in item)
            body += "<si>%s</si>" % runs
        else:
            body += "<si><t>%s</t></si>" % item
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
        '<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="%d" uniqueCount="%d">%s</sst>'
        % (len(items), len(items), body)
    )


def sheet(rows):
    """rows: zoznam (r, [(ref, xml_bunky) …]); prázdny zoznam = riadok bez buniek."""
    body = ""
    for r, cells in rows:
        inner = "".join(cells)
        body += '<row r="%d">%s</row>' % (r, inner)
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
        "<sheetData>%s</sheetData></worksheet>" % body
    )


def write(path, files):
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
        for name, content in files.items():
            z.writestr(name, content)
    print("zapísané:", path, os.path.getsize(path), "B")


# ── fixture 1: realistický export kontaktov ─────────────────────────────
S = ["Meno a priezvisko", "Mobil", "E-mail", "Poznámka", "Zapísané", "Rozpočet",
     "Žofia Krajčírová", "jan@example.sk", ["Vážny ", "záujemca"], "Ľubomír Ščasný"]
sheet1 = sheet([
    (1, ['<c r="A1" t="s"><v>0</v></c>', '<c r="B1" t="s"><v>1</v></c>',
         '<c r="C1" t="s"><v>2</v></c>', '<c r="D1" t="s"><v>3</v></c>',
         '<c r="E1" t="s"><v>4</v></c>', '<c r="F1" t="s"><v>5</v></c>']),
    # plný riadok: shared string, inline string, shared string, rich text, dátum (fmt 14), číslo
    (2, ['<c r="A2" t="s"><v>6</v></c>',
         '<c r="B2" t="inlineStr"><is><t>+421 900 111 222</t></is></c>',
         '<c r="C2" t="s"><v>7</v></c>',
         '<c r="D2" t="s"><v>8</v></c>',
         '<c r="E2" s="1"><v>45123</v></c>',
         '<c r="F2" s="3"><v>185000</v></c>']),
    (3, []),  # úplne prázdny riadok — musí vypadnúť
    # riedky riadok: chýba B a D, dátum vo vlastnom formáte 164, boolean namiesto čísla
    (4, ['<c r="A4" t="s"><v>9</v></c>',
         '<c r="C4" t="inlineStr"><is><t>lubo@example.sk</t></is></c>',
         '<c r="E4" s="2"><v>45200</v></c>',
         '<c r="F4" t="b"><v>1</v></c>']),
])
write(os.path.join(HERE, "kontakty.xlsx"), {
    "[Content_Types].xml": CONTENT_TYPES,
    "_rels/.rels": ROOT_RELS,
    "xl/workbook.xml": workbook([("Kontakty", False)]),
    "xl/_rels/workbook.xml.rels": workbook_rels(1),
    "xl/sharedStrings.xml": shared_strings(S),
    "xl/styles.xml": STYLES,
    "xl/worksheets/sheet1.xml": sheet1,
})

# ── fixture 2: prvý hárok skrytý, dáta sú až v druhom ───────────────────
hidden = sheet([(1, ['<c r="A1" t="inlineStr"><is><t>starý nepoužívaný hárok</t></is></c>'])])
visible = sheet([
    (1, ['<c r="A1" t="inlineStr"><is><t>Meno</t></is></c>',
         '<c r="B1" t="inlineStr"><is><t>Telefón</t></is></c>']),
    (2, ['<c r="A2" t="inlineStr"><is><t>Eva Nová</t></is></c>',
         '<c r="B2" t="inlineStr"><is><t>0901 000 001</t></is></c>']),
])
ct2 = CONTENT_TYPES.replace(
    '<Override PartName="/xl/worksheets/sheet1.xml"',
    '<Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
    '<Override PartName="/xl/worksheets/sheet1.xml"',
)
write(os.path.join(HERE, "skryty-prvy-harok.xlsx"), {
    "[Content_Types].xml": ct2,
    "_rels/.rels": ROOT_RELS,
    "xl/workbook.xml": workbook([("Archív", True), ("Kontakty", False)]),
    "xl/_rels/workbook.xml.rels": workbook_rels(2),
    "xl/sharedStrings.xml": shared_strings([]),
    "xl/styles.xml": STYLES,
    "xl/worksheets/sheet1.xml": hidden,
    "xl/worksheets/sheet2.xml": visible,
})
