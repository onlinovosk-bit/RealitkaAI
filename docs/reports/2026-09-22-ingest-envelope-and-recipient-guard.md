# TASK-INGEST-VERIFY-ENVELOPE — čo je dokázané, čo nie, a čo sa pritom našlo

**Dátum:** 2026-09-22 · **Režim:** read-only (produkčná DB len `SELECT`, žiadny zápis)
**Zadanie:** dokázať alebo vyvrátiť, že `email.to` v `/api/acquire/email` je **obálkový**
príjemca (RCPT TO) aj pri skutočne preposlanej pošte.

---

## Záver v jednej vete

Otázku sa **nepodarilo uzavrieť** — do dnešného dňa neprišla ani jedna skutočne preposlaná
správa, takže nie je čo merať. Pri hľadaní dôkazu však vypadli **dve chyby v kóde, ktorý
vlastníme**, a obe majú dnes symptóm v produkčných dátach.

---

## 1. Prečo sa otázka nedá uzavrieť dátami

Zdroj `email.to` je **Cloudflare Worker, ktorý nie je v tomto repozitári.** Overené:
`find` nad celým stromom nenašiel `wrangler.toml` / `wrangler.json`, ani zdroj workera.
Route má v hlavičke len vetu „Worker to už vyriešil" (`route.ts:6`). Kontrakt, na ktorom
stojí priradenie leadov ôsmim maklérom, je teda **mimo verzovania a mimo review**.

To je samo o sebe nález: `payload.mailbox.agencyId` určuje, do ktorej agentúry lead padne,
a `email.to` určuje, ktorému maklérovi. Oboje príde zvonka a nič v repozitári to nekontroluje.

## 2. Čo produkčné dáta hovoria (namerané, nie odvodené)

`inbound_mailboxes`, 11 riadkov, **všetky na doméne `revolis.ai`**:

| skupina | počet | `profile_id` | vytvorené |
|---|---|---|---|
| staršie adresy | 3 | NULL | 2026-07-02 až 2026-07-19 |
| adresy maklérov | 8 | vyplnené | 2026-09-21 19:08 a 19:19 |

Heartbeaty (`last_received_at`) sú tri: jeden z júla, jeden **07:40:05 UTC** na
namapovanej adrese, jeden **09:17:11 UTC** na **staršej nenamapovanej** adrese.

Leady za dnešok, obidva `assigned_profile_id` **NULL**:

| čas (UTC) | zdroj | kontaktný e-mail | telefón |
|---|---|---|---|
| 05:47:05 | `portal:Bazoš.sk` | doména **`realitysmolko.sk`** | áno |
| 09:13:13 | `portal:Nehnuteľnosti.sk` | **žiadny** | áno |

#633 bol zmergovaný **07:13:28 UTC**. Lead z 05:47 je teda spred nasadenia — to, že nemá
majiteľa, nie je chyba. Lead z 09:13 je **po** nasadení a majiteľa nemá.

### Čo z toho plynie

- **Atribúcia funguje, keď mail príde na namapovanú adresu.** Heartbeat o 07:40:05 je
  presne môj testovací mail zo 07:39:59. Cesta adresa → `profiles` → `assigned_profile_id`
  je overená v produkcii.
- **Reálna prevádzka na namapované adresy zatiaľ nechodí.** Správa o 09:17 dopadla na
  staršiu zdieľanú adresu bez `profile_id`, lead o 09:13 nezhodoval **žiadny** riadok
  (heartbeat o štyri minúty neskôr je iná správa — heartbeat sa zapisuje *pred* insertom
  v tej istej požiadavke, nemôže prísť po ňom).
- **Nula z dnešných reálnych leadov má majiteľa.** Nie preto, že kód nefunguje, ale preto,
  že makléri preposielanie ešte nezapli. Atribúcia nevie priradiť to, čo stále chodí
  na spoločnú adresu.

## 3. Nález A — doménová stráž je po presťahovaní ingestu mŕtva

`email-adapter.ts:107` rozhoduje, či nájdená adresa je kontakt, alebo adresa RK:

```ts
if (domain === "revolis.ai") return true;          // naša ingest schránka
const recipientDomain = r.split("@")[1];
return Boolean(recipientDomain) && domain === recipientDomain;  // vlastná doména RK
```

Posledný riadok vylučuje adresu **len ak sa jej doména rovná doméne príjemcu.** Kým ingest
bežal na adrese RK (`…@realitysmolko.sk`), stráž fungovala — preto vznikla. Odkedy ingest
beží na `…@revolis.ai`, je `recipientDomain` **vždy `revolis.ai`**, a doména RK sa s ňou
nikdy nezhoduje. Stráž teda **už nikdy nevylúči vlastné adresy klienta.**

Symptóm v dátach: lead z 05:47 má kontaktný e-mail na doméne `realitysmolko.sk`. Kontakt
nie je záujemca — je to niekto od klienta.

**Zhoršujúca okolnosť:** `pickContactEmail` na konci robí
`return labelled; // radšej adresa príjemcu než žiadny kontakt` — vráti adresu, **aj keď ju
`isNonLeadAddress` vylúčila.** Fallback teda stráž obchádza. Pri leade, ktorý má telefón
(obidva dnešné ho majú), je to zlá výmena: radšej žiadny e-mail než cudzí.

## 4. Nález B — auto-odpoveď mieri na ten istý e-mail

`inbound-lead-auto-response.ts:181` posiela `to: leadEmail`, a
`autoResponseEnabled = flags.auto_response_enabled !== false` — teda **zapnuté, pokiaľ
nie je výslovne vypnuté.** V produkcii má `auto_response_enabled = true` **všetkých 6
agentúr.**

Spojené s nálezom A to znamená, že automatická odpoveď záujemcovi môže odísť na adresu
klienta. Či pri leade z 05:47 naozaj odišla, som **nepotvrdil** — `platform_events` má
za dnešok iba `lead.created` (2×), auto-odpoveď tam stopu nenecháva.

## 5. Rozhodujúci test na pôvodnú otázku (1 správa, ~2 minúty)

Jeden maklér zapne preposielanie na svoju namapovanú adresu a nechá si na ňu doraziť jeden
portálový dopyt. Potom platí:

- **heartbeat sa objaví na riadku toho makléra** → `email.to` je obálkový príjemca,
  atribúcia pri preposielaní funguje;
- **nezhoduje sa nič** (ako pri leade z 09:13) → Worker posiela hlavičku `To:`, a
  **každý preposlaný mail ostane bez priradenia.** V tom prípade sa mení Worker, nie CRM.

Predpoveď je testovateľná a lacná. Kým nepadne, tvrdenie „makléri uvidia svoje dopyty
priradené" nie je podložené.

**E-mail maklérom bol medzitým odoslaný (2026-09-22).** Test sa tým nestal zbytočným —
stal sa nevyhnutným a časovo tlačeným: prvá preposlaná správa, ktorá príde, je zároveň
odpoveďou na túto otázku. Zároveň platí opačný smer rizika: keď makléri preposielanie
zapnú, objem pošty cez túto cestu stúpne, a nálezy A a B sa škálujú s ním.

## 6. Návrh opravy (NEIMPLEMENTOVANÉ — čaká na GO)

1. Vylučovať adresy podľa **domén agentúry**, nie podľa domény príjemcu: zoznam vlastných
   domén na agentúre, porovnávať proti nemu. Odstráni závislosť na tom, kde beží ingest.
2. Zrušiť fallback na vylúčenú adresu, keď lead má telefón. Prázdny e-mail je čitateľný
   stav; cudzí e-mail vyzerá ako platný kontakt a spustí auto-odpoveď.
3. Test, ktorý drží nález A: dopyt doručený na `…@revolis.ai`, v tele adresa
   `…@realitysmolko.sk` → kontakt musí byť NULL, nie tá adresa.

Body 1 a 2 menia správanie parsera a auto-odpovede, teda sa ich bez GO nedotýkam.

---

## Čo je dokázané a čo nie

| tvrdenie | stav |
|---|---|
| atribúcia funguje pri priamo adresovanej správe | **dokázané** (heartbeat 07:40) |
| `email.to` je obálkový príjemca pri preposlanej pošte | **nedokázané** — chýba vzorka |
| Worker je mimo repozitára a mimo review | **dokázané** |
| doménová stráž po presťahovaní ingestu nevylúči domény klienta | **dokázané** (kód + lead z 05:47) |
| auto-odpoveď je zapnutá a mieri na `leadEmail` | **dokázané** (kód + 6/6 agentúr) |
| auto-odpoveď pri leade z 05:47 naozaj odišla | **nepotvrdené** |
