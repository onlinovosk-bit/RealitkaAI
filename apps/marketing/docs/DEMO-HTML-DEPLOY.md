# www.revolis.ai/demo.html — odkiaľ sa servíruje

| Položka | Hodnota |
|---------|---------|
| **Vercel projekt** | `revolis-marketing` (onlinovosk-4317s-projects) |
| **Repo cesta** | `apps/marketing/` |
| **Súbor** | `public/demo.html` → URL `/demo.html` |
| **Mechanizmus** | Next.js `public/` — statické súbory bez build transformácie |
| **Produkčná doména** | `www.revolis.ai` (marketing), nie `app.revolis.ai` (CRM) |

## História

- **Pred 2026-06-12:** starý `demo.html` (Smolko meno, fake testimonialy, live counter, 4.9/5).
- **PR #166:** pridaný `revolis-demo-v3.html` (CRO v3), ale **nebol prepojený** na `/demo.html`.
- **fix/demo-v3-live:** `demo.html` := obsah v3 (anonymná RK Prešov, bez fake social proof).

## Deploy

Merge do `main` → Vercel auto-deploy `revolis-marketing` → overiť `https://www.revolis.ai/demo.html`.
