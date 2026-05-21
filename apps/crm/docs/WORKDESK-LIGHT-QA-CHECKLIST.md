# Workdesk Light — L99 QA Gate

Minimal gate before merge/deploy of Workdesk light migration (dashboard, leads, pipeline).

## 1. Dark-token scan (required)

From `apps/crm`:

```powershell
.\scripts\check-workdesk-dark-tokens.ps1
```

Or equivalent grep (scoped paths only):

```powershell
rg -n -i -g "*.tsx" -g "*.ts" -g "*.css" -e "bg-black|bg-slate-950|bg-slate-900|#050914|#080D1A|#0A1628|#060D1C|border-slate-800" "src/app/(dashboard)" "src/components/leads" "src/components/pipeline" "src/components/dashboard"
```

**Pass:** exit code `0`, no matches. **Fail:** any `file:line:content` hit — fix before merge.

## 2. Build

```bash
npm run build
```

**Pass:** build completes with no errors.

## 3. Smoke routes

With preview or local dev running, verify HTTP 200 and usable UI (no blank/error shell):

| Route | Checks |
|-------|--------|
| `/dashboard` | Loads; cards/widgets readable on light surface |
| `/leads` | List/table; filters/actions visible |
| `/pipeline` | Board/columns; drag handles if applicable |

## 4. Responsive (375px / 768px / 1280px)

- **Sidebar:** collapses or overlays; no horizontal scroll trap
- **Topbar:** title/actions not clipped; menu reachable
- **Cards:** padding and text contrast on light background; no overflow bleed

## 5. No dark surfaces (visual)

Scoped Workdesk areas must not show:

- Near-black page/canvas fills (`#050914`, `#080D1A`, `#0A1628`, `#060D1C`, `bg-black`, `bg-slate-950/900`)
- Heavy `border-slate-800` panel framing on primary content

Marketing/landing routes are out of scope for this checklist.

## Sign-off

- [ ] Dark-token script exit `0`
- [ ] `npm run build` green
- [ ] Smoke routes OK
- [ ] Responsive sidebar/topbar/cards OK
- [ ] No dark primary surfaces in scoped Workdesk UI
