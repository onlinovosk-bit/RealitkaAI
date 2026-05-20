# 🗺️ Skill: ENV_VARIABLES_MAP

## Účel
Jediný zdroj pravdy pre všetky environment premenné projektu RealitkaAI / Revolis.
Agent NESMIE hádať hodnoty ENV premenných. Vždy čítaj tento súbor.

---

## Pravidlá

1. **Nikdy necommitovať** `.env` súbory do gitu
2. **Production** hodnoty sa nastavujú výhradne vo Vercel → Settings → Environment Variables
3. **Local dev** používa `.env.local` (je v `.gitignore`)
4. Po zmene ENV premenných vo Vercel → **treba redeploy** (nie automaticky)
5. Sensitive hodnoty (secrets, API keys) nastavovať s **Sensitive toggle ON** vo Vercel

---

## Kompletná mapa ENV premenných

### 🔗 Realvia Integration
| Premenná | Environment | Popis |
|---|---|---|
| `REALVIA_ALLOWED_IP` | Production | Povolené IP adresy Realvia webhook serverov |
| `REALVIA_IDENTIFIER` | Production | Hodnota header `identifikator` |
| `REALVIA_IDENTIFIER_2` | Production | Hodnota header `identifikator2` |
| `REALVIA_SHARED_SECRET` | Production | Fallback autentifikačný secret |

### 🤖 AI / Decision Engine
| Premenná | Environment | Popis |
|---|---|---|
| `DECISION_ENGINE_ENABLED` | Production | Zapnutie/vypnutie decision engine (true/false) |
| `CLOSING_WINDOW_ENABLED` | Production | Closing window feature flag |
| `AI_JOBS_BATCH_SIZE` | Production | Počet záznamov spracovaných naraz v AI batch joboch |
| `TRIAGE_LOCK_STALE_MS` | Production | Timeout pre stale triage lock (v ms) |
| `RESCUE_AUTOMATION_ENABLED` | Production | Záchranná automatizácia (true/false) |

### 🗄️ Database
| Premenná | Environment | Popis |
|---|---|---|
| `DATABASE_URL` | All | PostgreSQL connection string |
| `DIRECT_URL` | All | Direct DB URL (pre Prisma migrations) |

### 🔐 Auth
| Premenná | Environment | Popis |
|---|---|---|
| `NEXTAUTH_SECRET` | All | NextAuth.js secret |
| `NEXTAUTH_URL` | Production | Production URL (`https://app.revolis.ai`) |

### 📡 External APIs
| Premenná | Environment | Popis |
|---|---|---|
| `ANTHROPIC_API_KEY` | All | Claude API key |
| `OPENAI_API_KEY` | All | OpenAI API key (fallback) |

---

## Ako pridať novú ENV premennú

### Via Vercel UI (odporúčané pre sensitive hodnoty):
1. Vercel → projekt → Settings → Environment Variables
2. Kliknúť **"Import .env"** a vložiť obsah
3. Vybrať environment: **Production**
4. Zapnúť **Sensitive** toggle pre secrets
5. Kliknúť **Save**
6. **Redeploy** projekt

### Via Vercel CLI:
```bash
vercel env add NAZOV_PREMENNEJ
# Vypýta hodnotu a environment interaktívne
```

### Pre lokálny vývoj:
```bash
# .env.local (nikdy necommitovať)
NAZOV_PREMENNEJ=hodnota
```

---

## Generovanie secretov

```bash
# 64-znakový hex secret (odporúčané)
openssl rand -hex 32

# Node.js alternatíva
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Python alternatíva
python3 -c "import secrets; print(secrets.token_hex(32))"
```

---

## Časté chyby

| Chyba | Príčina | Riešenie |
|---|---|---|
| `No environment variables were created` | Chýba Key alebo Value | Použiť "Import .env" |
| Premenná nefunguje na produkcii | Zabudnutý redeploy | Vercel → Deployments → Redeploy |
| `undefined` v kóde | Premenná len v `.env.local`, nie vo Vercel | Pridať do Vercel |
| Secret viditeľný v logoch | Sensitive toggle nebol zapnutý | Znovu uložiť so Sensitive ON |
