# P0 — Realvia mapovanie je nielen neúplné, je nesprávne

**Overené v prod DB `ypgajkhqtbriqqmyawyv` 3. 9. 2026**, agentúra Reality Smolko
`11111111-1111-1111-1111-111111111111`, 132 nehnuteľností.
**Zdroj: `payload_raw->'advert'` — teda to, čo Realvia reálne poslala.**

Toto patrí do Integration Reportu v #511 **pred** akýmkoľvek `GO IMPLEMENT`.

---

## 1. Cursorov nález potvrdený a spresnený

`mapCategory` v `apps/crm/src/lib/realvia/processQueue.ts:477` má nad sebou
priznanie:

```ts
/**
 * TODO: Populate from Realvia číselníky documentation.
 */
function mapCategory(category: number): string {
  const categoryMap: Record<number, string> = { 11:'Byt', 12:'Byt', 13:'Dom',
    14:'Dom', 15:'Pozemok', 16:'Pozemok', 17:'Komerčná', 18:'Komerčná',
    19:'Ostatné', 20:'Ostatné' };
  return categoryMap[category] ?? 'Ostatné';
}
```

Číselník sa nikdy nedoplnil. **86 zo 132 (65,2 %) padá do `?? 'Ostatné'`.**
Cursorov re-count je správny, môj skorší údaj 83 / 63 % bol nízky —
nezapočítal som stiahnuté ponuky.

## 2. Ale nie je to len neúplné. Kódy 13 a 14 sú namapované ZLE

| Realvia kód | ks | čo to podľa titulov reálne je | náš `type` |
|---:|---:|---|---|
| 30 | 30 | pozemok | `Ostatné` ❌ |
| 12 | 21 | byt | `Byt` ✓ |
| 20 | 15 | rodinný dom | `Ostatné` ❌ |
| **13** | **14** | **byt na prenájom** | **`Dom`** ⛔ |
| 11 | 9 | byt | `Byt` ✓ |
| 47 | 8 | administratívno-prevádzkové | `Ostatné` ❌ |
| 41 | 8 | pozemky | `Ostatné` ❌ |
| 46 | 6 | kancelárske priestory | `Ostatné` ❌ |
| 37 | 5 | pozemok | `Ostatné` ❌ |
| 9 | 3 | garsónka | `Ostatné` ❌ |
| 34 | 2 | pozemok na podnikanie | `Ostatné` ❌ |
| 60 | 2 | nebytový priestor | `Ostatné` ❌ |
| **14** | **2** | **4-izbový byt na prenájom** | **`Dom`** ⛔ |
| 61,48,27,65,28,57,35 | po 1 | sklad, komerčné, chata, dom, pozemok, kancelária, pozemok | `Ostatné` ❌ |

**16 nehnuteľností má nesprávnu kategóriu, ktorá vyzerá správne.**
To je horšie než `Ostatné` — `Ostatné` je viditeľne prázdne, `Dom` na byte
prejde bez povšimnutia až do porovnateľných.

## 3. ⛔ Väčší nález: `mapTransaction` je rozbitý rovnako

| Realvia `transaction` | ks | náš `transaction_type` | z toho má v titule „prenájom" |
|---:|---:|---|---:|
| 127 | 68 | `Predaj` | 0 |
| **123** | **53** | **`Predaj`** | **44** |
| 122 | 11 | `Predaj` | 0 |

Realvia posiela kódy **122 / 123 / 127**. Mapper ich nepozná a všetko
označí ako `Predaj`.

**Kód 123 je podľa titulov takmer isto Prenájom.** To je **53 ponúk,
teda 40 % Smolkovho portfólia, ktoré systém považuje za predaj.**

### Toto ruší moje predchádzajúce tvrdenie

Napísal som, že *„Smolko nemá v systéme ani jeden prenájom"*. **Bolo to
nesprávne.** Čítal som výstup rozbitého mappera ako fakt. Prenájmy má —
systém ich len nevie rozlíšiť.

## 4. Predané ponuky existujú, ale len ako text v titule

**11 ponúk má v `title` reťazec `***PREDANÉ***`**, pritom `status` je
`Aktívna`. Napríklad:

```
***PREDANÉ***  Zriedkavá ponuka - pozemok na výstavbu RD, Prešov - Šalgovík
***PREDANÉ***1 izbový byt, 43 m², 2.p., Prešov
```

Skorší záver „nemáme ani jeden predaj" teda platí pre `status`, nie pre
realitu. Údaj o predaji existuje — je v nesprávnom poli.

**Nepoužívať to na výpočty.** Je to text, nie dátum ani stav. Ale je to
signál, že Realvia niekde stav predaja nesie a náš mapper ho zahadzuje.

---

## Čo z toho vyplýva pre Property Launch Pack V0

1. **Do Integration Reportu doplniť celú túto tabuľku kódov.** Nie „63 %
   Ostatné", ale konkrétne kódy a ich reálny význam podľa titulov.
2. **`mapTransaction` je P0 rovnako ako `mapCategory`** a v #511 sa
   nespomína vôbec.
3. **Bez číselníka od Realvie sa to neopraví správne.** Vyžiadať oficiálnu
   dokumentáciu kódov kategórií aj transakcií. Odvodzovať význam z titulov
   je dobré na diagnostiku, **nie na opravu produkčného mappera.**
4. Kým sa to neopraví, **Launch Pack nesmie tvrdiť typ ani transakciu
   nehnuteľnosti bez potvrdenia maklérom.** Guardian to musí označiť ako
   neoverený fakt — inak vygeneruje inzerát „Dom na predaj" na byt
   na prenájom.
5. Fáza 3 Concierge má filtrovať podľa typu a nájom/predaj. **Nad týmito
   dátami by dnes filter vracal nezmysly.**

## Spresnenie governance pravidla

Pravidlo „code audit ≠ data audit" je správne, ale nestačí. Riadky
existovali — a boli nesprávne.

> **Počet riadkov dokazuje, že dáta existujú. Nedokazuje, že sú správne.**
> Pri každom poli, ktoré vzniklo mapovaním z externého zdroja, sa hodnota
> overuje proti nezávislému signálu z toho istého záznamu — tu proti titulu.

## Zakázané

- Opravovať `mapCategory` alebo `mapTransaction` v tomto kroku.
- Odvodzovať číselník z titulov a zapísať ho do kódu.
- Prepisovať `status` podľa reťazca `***PREDANÉ***` v titule.

Najprv číselník od Realvie, potom oprava, potom backfill — každé
so samostatným GO.
