# Portálový telefón s lomkou ostáva lead

Dátum: 2026-10-16. Parser `1.5` (`#873`) už nestrháva e-mail v zátvorkách. Ďalší pád existujúceho portálového pravidla: číslo `0905/123456` alebo `0905-123-456` bez e-mailu nesedelo na `L.phone` ani `PHONE_RE`, takže dopyt skončil ako `no_contact`.

Zmena je len v oddeľovačoch (`/`, `-`) a v `PARSER_VERSION` `1.6`. `eventId` sa ďalej počíta z `rawHash` + `receivedAt`, nie z verzie parsera. Žiadna nová doména v `SOURCE_RULES`.
