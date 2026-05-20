# 🚀 Skill: DEPLOYMENT_CHECKLIST

## Účel
Presný postup pred každým deployom. Agent nesmie deploynúť bez splnenia tohto checklistu.
Nedodržanie → broken production → strata dát klientov.

---

## ZAKÁZANÉ operácie (NIKDY)

```
❌ git merge
❌ git push --force
❌ deploy bez buildu
❌ commit súborov mimo aktuálneho scope
❌ unrelated lokálny noise v commite
```

---

## Povolené operácie

```
✅ lint
✅ build
✅ commit iba scoped files
✅ push
✅ stacked PR
```

---

## Workflow – krok za krokom

### 1. Lint
```bash
cd apps/crm
pnpm lint
# Nula warningov = OK. Ak sú errory → opraviť pred pokračovaním.
```

### 2. Build
```bash
pnpm build
# Musí skončiť bez chýb. Build error = STOP, nedeploy.
```

### 3. Scoped commit
```bash
# Commitovať VÝHRADNE súbory súvisiace s aktuálnym taskom
git add apps/crm/src/lib/realvia/validate.ts
git add apps/crm/src/app/api/webhooks/realvia/route.ts
# NIE: git add .   ← zakázané ak sú iné zmenené súbory

git commit -m "feat(realvia): oprav webhook IP validáciu"
```

### 4. Push
```bash
git push origin feature/nazov-vetvy
```

### 5. PR (nie merge, nie deploy manuálne)
- Otvoriť PR na GitHub
- Vercel automaticky vytvorí preview deployment
- Skontrolovať preview URL
- Až po review → merge do main → automatický production deploy

---

## Commit message formát

```
typ(scope): krátky popis v slovenčine alebo angličtine

Typy:
feat     → nová funkcionalita
fix      → oprava bugy
chore    → údržba, deps
refactor → refaktoring bez zmeny správania
docs     → dokumentácia
test     → testy
```

### Príklady:
```bash
git commit -m "feat(realvia): pridaj IP whitelist validáciu"
git commit -m "fix(webhook): oprav chýbajúce auth headers"
git commit -m "chore(env): aktualizuj REALVIA_ALLOWED_IP"
```

---

## Branch stratégia

```
main
  └── feature/slate-team-core
  └── feature/slate-co
  └── feature/realvia-webhook
```

- Každý task = vlastná vetva
- Nikdy nepracovať priamo na `main`
- Stacked PR = séria vetiev kde každá závisí od predošlej

---

## Pre-deploy kontrolný zoznam

```
□ pnpm lint → 0 errors
□ pnpm build → success
□ Len scoped súbory v commite
□ ENV premenné nastavené vo Vercel (ak nové)
□ PR otvorený a skontrolovaný
□ Preview deployment funguje
```

---

## Po deployi

```bash
# Overiť že produkcia beží
curl -X POST https://app.revolis.ai/api/webhooks/realvia \
  -H "Content-Type: application/json" \
  -H "identifikator: <REALVIA_IDENTIFIER>" \
  -H "identifikator2: <REALVIA_IDENTIFIER_2>" \
  -d '{"test": true}'

# Očakávaná odpoveď: 200 OK
```

---

## Vercel deployment status

- **Vercel Dashboard:** vercel.com/onlinovosk-4317s-projects/realitka-ai
- **Production URL:** https://app.revolis.ai
- **Auto-deploy:** pushom na `main`
- **Preview deploy:** každý PR automaticky
