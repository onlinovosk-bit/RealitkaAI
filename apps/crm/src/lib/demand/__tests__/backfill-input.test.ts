import { describe, expect, it } from "vitest";
import { parseEmail } from "@/lib/acquire/email-adapter";
import { decodeHeader, emailInquiry, messagesFromFile, parseEml, splitMbox } from "../backfill-input";

const BODY = `nehnutelnosti.sk notification
Meno: Jana Testová
E-mail: jana@example.com
Telefon: +421 912 345 678
Sprava: Hľadáme 3-izbový byt v Petržalke do 200 000 €, chceme kúpiť.
PO12345X`;

function qp(s: string): string {
  return [...Buffer.from(s, "utf8")]
    .map((b) => (b === 0x0a ? "\n" : b >= 0x20 && b < 0x7f && b !== 0x3d ? String.fromCharCode(b) : `=${b.toString(16).toUpperCase().padStart(2, "0")}`))
    .join("");
}

const EML_QP = `From: "Nehnutelnosti.sk" <noreply@nehnutelnosti.sk>
To: info@agentura.example
Subject: =?UTF-8?Q?Nov=C3=BD_dopyt?=
Date: Tue, 18 Mar 2025 10:00:00 +0100
MIME-Version: 1.0
Content-Type: text/plain; charset=UTF-8
Content-Transfer-Encoding: quoted-printable

${qp(BODY)}
`;

const EML_MULTIPART_1250 = `From: noreply@nehnutelnosti.sk
To: info@agentura.example
Subject: =?windows-1250?B?${Buffer.from([0x4e, 0x6f, 0x76, 0xfd, 0x20, 0x64, 0x6f, 0x70, 0x79, 0x74]).toString("base64")}?=
Content-Type: multipart/alternative; boundary="b1"

--b1
Content-Type: text/plain; charset=windows-1250
Content-Transfer-Encoding: base64

${encode1250(BODY)}
--b1
Content-Type: text/html; charset=UTF-8
Content-Transfer-Encoding: 7bit

<p>html copy</p>
--b1
Content-Type: application/pdf
Content-Disposition: attachment; filename="x.pdf"
Content-Transfer-Encoding: base64

JVBERi0=
--b1--
`;

function encode1250(s: string): string {
  const map: Record<string, number> = { "ľ": 0xbe, "á": 0xe1, "ý": 0xfd, "ž": 0x9e, "ú": 0xfa, "é": 0xe9, "ô": 0xf4, "č": 0xe8, "ť": 0x9d, "€": 0x80, "ó": 0xf3, "í": 0xed, "š": 0x9a, "ň": 0xf2 };
  return Buffer.from([...s].map((c) => map[c] ?? c.charCodeAt(0))).toString("base64");
}

describe("MIME reader", () => {
  it("decodes RFC 2047 subjects in UTF-8 and windows-1250", () => {
    expect(decodeHeader("=?UTF-8?Q?Nov=C3=BD_dopyt?=")).toBe("Nový dopyt");
    expect(decodeHeader("=?UTF-8?B?Tm92w70=?= =?UTF-8?Q?_dopyt?=")).toBe("Nový dopyt");
  });

  it("quoted-printable UTF-8 body comes back verbatim", () => {
    const m = parseEml(EML_QP);
    expect(m.subject).toBe("Nový dopyt");
    expect(m.text).toContain("Hľadáme 3-izbový byt v Petržalke do 200 000 €");
    expect(m.date).toContain("2025");
  });

  it("multipart: base64 windows-1250 text + html, attachment ignored", () => {
    const m = parseEml(EML_MULTIPART_1250);
    expect(m.subject).toBe("Nový dopyt");
    expect(m.text).toContain("Hľadáme 3-izbový byt v Petržalke do 200 000 €");
    expect(m.html).toContain("html copy");
    expect(m.text + m.html).not.toContain("JVBERi0");
  });

  it("mbox splits messages and unescapes >From", () => {
    const mbox = `From 1@x Tue Mar 18 10:00:00 2025\n${EML_QP}\nFrom 2@x Tue Mar 18 11:00:00 2025\nSubject: b\n\n>From the start\n`;
    const msgs = splitMbox(mbox);
    expect(msgs).toHaveLength(2);
    expect(msgs[1]).toContain("\nFrom the start");
    expect(messagesFromFile("export.mbox", mbox)).toHaveLength(2);
  });

  it("txt is the body; unknown extensions are skipped", () => {
    expect(messagesFromFile("a.txt", BODY)[0].text).toBe(BODY);
    expect(messagesFromFile("a.pdf", BODY)).toEqual([]);
  });
});

describe("production parse path", () => {
  it("yields exactly what acquire/email hands to demand extraction", () => {
    const m = parseEml(EML_QP);
    const r = emailInquiry(m);
    const ev = parseEmail([m.subject, m.text, m.html].join("\n"), "2025-03-18", {
      recipient: m.to, subject: m.subject, from: m.from, addresses: [], domains: [],
    });
    expect(r).toMatchObject({ ok: true, inquiryText: ev.inquiryText, leadName: ev.contactName });
    expect(r.ok && r.inquiryText).toContain("200 000");
  });

  it("the id is content-derived and carries no name or address", () => {
    const a = emailInquiry(parseEml(EML_QP));
    expect(a.id).toMatch(/^email:[0-9a-f]{12}$/);
    expect(emailInquiry(parseEml(EML_QP)).id).toBe(a.id);
  });

  it("a mail production would not turn into a lead is skipped, with the reason", () => {
    const r = emailInquiry(messagesFromFile("u.txt", "unsubscribe from list\nE-mail: x@y.sk")[0]);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.reason).toBeTruthy();
  });
});
