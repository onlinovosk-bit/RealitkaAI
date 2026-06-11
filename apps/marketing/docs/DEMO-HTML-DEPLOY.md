# www.revolis.ai/demo.html — odkiaľ sa servíruje

| Položka | Hodnota |
|---------|---------|
| **Vercel projekt** | `revolis-marketing` (onlinovosk-4317s-projects) |
| **Repo cesta** | `apps/marketing/` |
| **Súbor** | `public/demo.html` → URL `/demo.html` |
| **Jediný zdroj pravdy** | `apps/marketing/public/demo.html` — žiadny paralelný súbor (`revolis-demo-v3.html` bol sirote a bol zmazaný). |
| **Mechanizmus** | Next.js `public/` — statické súbory bez build transformácie |
| **Produkčná doména** | `www.revolis.ai` (marketing), nie `app.revolis.ai` (CRM) |

## História

- **Pred 2026-06-12:** starý `demo.html` (Smolko meno, fake testimonialy, live counter, 4.9/5).
- **PR #166:** v3 najprv len ako `revolis-demo-v3.html` (sirota) — **nebol prepojený** na `/demo.html` (vzor: MERGED ≠ LIVE).
- **#182:** `demo.html` := v3; sirote `revolis-demo-v3.html` zmazaná.

## Deploy

Merge do `main` → Vercel auto-deploy `revolis-marketing` → overiť `https://www.revolis.ai/demo.html`.
