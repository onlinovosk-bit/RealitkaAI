# Prod smoke — /upgrade after #369

**Dátum:** 2026-09-18  
**Commit:** `30a1ba906` (`fix(crm): restore /upgrade Stripe checkout`)  
**URL:** https://app.revolis.ai/upgrade

## Deploy

| Check | Result |
|---|---|
| Vercel – realitka-ai @ `30a1ba906` | **SUCCESS** (Deployment has completed) |
| Vercel – revolis-marketing | SUCCESS |
| `origin/main` upgrade page | contains `data.result?.url`; **not** `data.data?.result?.url` |

## HTTP / browser

| Step | Result |
|---|---|
| `GET /upgrade` (anon) | **307** → `/login` (`X-Matched-Path: /upgrade`) |
| Browser navigate `/upgrade` | lands on login (session gate) |
| Authenticated click „Pokračovať do Stripe“ | **HUMAN** — agent nemá prod session |

## Verdict

- **Deploy + code path:** PASS (fix is on prod deployment for the merge SHA).  
- **End-to-end Stripe redirect:** not proven without login — needs founder/makler session once.

## Founder 30s check

1. Prihlás sa na https://app.revolis.ai  
2. Otvor `/upgrade`  
3. Seat program musí byť viditeľný (nie „Checkout momentálne nedostupný“, ak sú Stripe price IDs nastavené)  
4. „Pokračovať do Stripe“ → redirect na `checkout.stripe.com`
