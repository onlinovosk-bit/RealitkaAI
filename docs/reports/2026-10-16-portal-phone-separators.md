# Portálový telefón s bodkou alebo zátvorkou ostáva lead

Dátum: 2026-10-16. Parser `1.6` (`#875`) berie lomku a spojovník. Na existujúcom pravidle `nehnutelnosti.sk` / `reality.sk` stále padá dopyt bez e-mailu, keď je číslo `0905.123.456` alebo `+421 (905) 123 456` (`no_contact`).

Parser `1.7` tieto oddeľovače znormalizuje. `SOURCE_RULES` sa nerozširujú. `eventId` ostáva z `rawHash` + `receivedAt`.
