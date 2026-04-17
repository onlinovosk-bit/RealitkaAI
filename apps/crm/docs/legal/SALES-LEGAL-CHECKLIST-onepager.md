# SALES LEGAL CHECKLIST — ONE PAGER

**Použitie:** Rýchle odpovede sales tímu na tender/security/legal otázky  
**Produkt:** Revolis.AI (AI SaaS)  
**Verzia:** 1.0

---

## 1) Bezpečnosť (Security)

**Q: Kde sú uložené dáta?**  
A: Primárne v EÚ (Frankfurt / Írsko podľa služby). Data residency je popísaná vo VOP a DPA.

**Q: Ako chránite dáta?**  
A: TLS 1.3 in-transit, AES-256 at-rest, RBAC, MFA pre admin účty, logovanie prístupov, zálohy, incident response.

**Q: Máte security incident proces?**  
A: Áno, incident response workflow + notifikácia zákazníka podľa DPA.

---

## 2) GDPR / Privacy

**Q: Kto je controller a kto processor?**  
A: Zákazník je Controller, Revolis.AI je Processor (DPA).

**Q: Máte DPA?**  
A: Áno, DPA podľa čl. 28 GDPR je pripravené a súčasťou zmluvného balíka.

**Q: Ako riešite cezhraničný prenos?**  
A: SCC + TIA pre relevantné prenosy mimo EÚ.

**Q: Ako vybavujete DSAR žiadosti?**  
A: Súčinnosť controllerovi; spracovanie v zákonných lehotách (štandard 30 dní).

---

## 3) AI / Compliance

**Q: Je AI black-box?**  
A: Áno, služba je black-box; neposkytujeme raw model ani internú logiku.

**Q: Viete vysvetliť scoring?**  
A: Áno, poskytujeme explainability light (hlavné faktory vstup/výstup).

**Q: Kto nesie zodpovednosť za AI výstupy?**  
A: AI je rozhodovacia podpora; finálne rozhodnutie a použitie výstupov sú na zákazníkovi.

**Q: Trénujete na našich dátach modely pre iných?**  
A: Nie. Zákaznícke dáta sa nepoužívajú na tréning modelov pre tretie strany.

---

## 4) Dáta / Exit

**Q: Vieme exportovať všetky dáta?**  
A: Áno, export v štandardných formátoch (CSV/JSON/API) podľa plánu a VOP.

**Q: Čo sa stane po ukončení?**  
A: 30 dní export window, následne bezpečné vymazanie podľa retenčnej politiky.

---

## 5) Komerčné otázky

**Q: Máte performance-based pricing?**  
A: Áno, pri enterprise môže byť Performance Fee naviazaný na KPI.

**Q: Môžete meniť ceny?**  
A: Áno, ročná CPI indexácia + mimoriadne úpravy pri preukázanom raste third-party costs (podľa MSA/VOP).

---

## 6) Právna ochrana produktu

**Q: Môžeme robiť benchmark?**  
A: Len s predchádzajúcim písomným súhlasom.

**Q: Môžeme analyzovať AI logiku?**  
A: Nie. Reverse engineering/dekompilácia/odvodzovanie logiky je zmluvne zakázané.

---

## 7) Dokumenty, ktoré poslať pri enterprise due diligence

- MSA  
- VOP  
- DPA  
- SLA  
- Privacy Policy  
- Subprocessor list  
- (ak vyžiadané) pen-test summary / security Q&A

---

## 8) Escalation matrix pre sales

- **Legal redline nad rámec fallbackov:** eskalovať na Legal Lead  
- **Uncapped liability / source code audit / model disclosure:** okamžite eskalovať na CEO + Legal  
- **Data residency výnimky:** eskalovať na Security + Legal  

---

**Poznámka pre sales tím:**  
Neimprovizovať právne záväzky mimo schválených fallbackov. Každý odklon od template klauzúl musí byť písomne schválený.

