# Branch cleanup evidence pack (TASK-0003) — 2026-08-22

**BASE_SHA (origin/main):** `76bb31080aa0f6b7a0d77c33e5835402e64ee9ce`  
**Shallow:** `git rev-parse --is-shallow-repository` → **false** (this Cloud VM).  
**Delete / backup-ref push:** **not done** (GO REQUIRED; this pack is evidence only).

## Counts

| Metric | N |
|--------|--:|
| origin heads | 369 |
| delete candidates (ancestor of main, ahead=0, no open PR, not tagged, not protected) | 92 |
| keep | 277 |
| keep because ahead of main | 276 |
| keep because open PR | 36 |
| keep because protected | 1 |
| keep because tagged | 0 |

Previous “208” list is **not** reused. Tonight’s N is **92** under the rule above. Many squash-merge leftovers are in this 92; branches with unique commits remain in keep (276 ahead).

## Cherry / ancestry

For every delete candidate: `git merge-base --is-ancestor <tip> origin/main` is **true** and `git rev-list --count origin/main..<tip>` is **0**. Equivalent `git cherry origin/main <tip>` would be empty. **N = N**, not a sample.

## Tip SHA table (N=92)

| branch | tip SHA | last commit date |
|--------|---------|------------------|
| `chore/b1-auth-runbook-onboarding-unblock` | `bd4476bb84de6dbf49ad3de32720f1b5100956ae` | 2026-07-11 |
| `chore/brain-registry-drift-2026-07-27` | `863c0264fb979b0331928f99cf29aff093358119` | 2026-07-26 |
| `chore/brief10-wave-c-cleanup` | `b147791289a2c2377040f4bb30718bfcd91aa330` | 2026-06-25 |
| `chore/governance-northstar-r4` | `46a5e302fc118b88427bdc17af5047c10248ac12` | 2026-06-25 |
| `chore/preview-playwright-smoke` | `e1b286575d87a0db539b08552b0f3f6836f444f9` | 2026-07-13 |
| `chore/realvia-queue-triage` | `d0b30681c460538c89162968d7d91bd359520911` | 2026-06-25 |
| `chore/repo-hygiene-docs` | `8d287637b0204a94b112a50f285dc36921423793` | 2026-06-25 |
| `chore/revenue-telemetry` | `eae40f5c1043d337add9114b833a88f91f7fb024` | 2026-05-22 |
| `chore/rls-schema-parity-audit` | `51078af5fd962b276f930c727842f5c44b9a0ab4` | 2026-06-26 |
| `cursor/pilot-ferovo-realtime-workspace-crm` | `f38c646d1cbd225440767ea4bdba437309926302` | 2026-04-17 |
| `docs/bri-diagnostic-report` | `967127da6e8afb927befc594d38f32ca3ecac153` | 2026-06-19 |
| `docs/capabilities` | `748d4c222871918d02b49d8c1c63f3f12a06ec9c` | 2026-06-22 |
| `docs/decision-framework-skills` | `04203c772df7d0c50dd262cb3f09cbf1517838ac` | 2026-07-06 |
| `docs/ops-uc-smolko-handoff` | `300e842f2667a7ba94e6059095adacf8f7560d93` | 2026-06-19 |
| `docs/sales-tracker` | `1925b768530009927913e8bb2e08158acaddb8e6` | 2026-07-16 |
| `docs/stage0-pass-addendum` | `37fdff279802c705cc0dbaed9f6481f9b449eaaf` | 2026-08-15 |
| `feat/agency-billing-credits-migration` | `4e5f0d8d369173d3d13f92b3329f71aead13c804` | 2026-06-03 |
| `feat/brief8-cadastre-wms-display` | `1825f29b404e784baa1e61c83ff0d06862e1bdb3` | 2026-06-15 |
| `feat/crm-architect-leads-migration` | `993f2ae3ce51cf495ead55e107498a7667216146` | 2026-05-14 |
| `feat/crm-architect-workflows-w1-w4` | `fdf18e611ba92674987bcbda67846571fa3f4b57` | 2026-05-14 |
| `feat/demo-funnel-preview` | `2976e64b4c924e7fcbfcebc513a57da60bef5510` | 2026-05-22 |
| `feat/followup-agent-loop1` | `adda131f971396de31b4da055d67821f12c9144b` | 2026-06-25 |
| `feat/followup-drafts-ui` | `a0c794815139441a78dbdde2c6f11759779f6e0f` | 2026-06-25 |
| `feat/followup-guardian-gate` | `2f39aa0e62453103684455bcb5379ad792d6d0a2` | 2026-06-25 |
| `feat/forecast-risk-nba` | `89694f840bc1f22f0304a622886e0f6f0564b42e` | 2026-05-21 |
| `feat/guardian-v1-blok-c` | `13e512f5b4f78eaf700baf02364f17424d54f9fc` | 2026-07-27 |
| `feat/inbound-auto-response-variant-a` | `9cce516be75f1e40731632fe7aa64a63d2189017` | 2026-07-16 |
| `feat/l99-strategy-rollout` | `ee07ed397d93bdcdcea31aebdb8aff5617fedbc2` | 2026-06-02 |
| `feat/lead-form-public` | `4072f7100b3142de59071c761e0858b503704724` | 2026-06-28 |
| `feat/loop2-outcome-writer` | `9bbf7f44a70f0f9ba9a403a01a4cd5b368d46a21` | 2026-06-25 |
| `feat/marketing-zakulisie-token` | `07432308f5cb2c5031eeb9c53ccf65f85e0b7cf8` | 2026-06-03 |
| `feat/pipeline-action-nba` | `f3e5c4ff108be17af44f90cef53610f6d288b78b` | 2026-05-21 |
| `feat/realsoft-import-adapter` | `55b9e27f3fd5218378ed0c2a813e40b100b68b8f` | 2026-06-16 |
| `feat/revenue-intelligence-wire-not-delete` | `b3017a42037a896e5958e0187bacc05f4153279b` | 2026-06-15 |
| `feat/sk-ui-vertical-pack-sidebar` | `6f7db112cd38a13307049a99deb9f14ab1186205` | 2026-06-25 |
| `feat/starter-pack-47` | `5f60300e4408e6b6fb455bcf5b13eb0ce7a67a3f` | 2026-06-15 |
| `feat/stealth-recruiter-ingest-presov` | `29dedc8a4af66d78443b58050e16e254c1570c1d` | 2026-05-31 |
| `feat/team-action-nba` | `1cab70d97150e726d64bcae7bff25206564fe65e` | 2026-05-21 |
| `feat/vertical-pack-listing-generator` | `eb3048fd3f32f3f8b91ed0b48c330a8c6026922c` | 2026-06-19 |
| `feat/vertical-pack-quality-guardian` | `68896f96489cbc6a3a1ebd5e15194d7507f0a09d` | 2026-06-19 |
| `feat/vlna1-pr1-dashboard-insights` | `e7c16d77ac2c082bc60eae03b077765c6a048edc` | 2026-06-03 |
| `feat/vlna1-pr1-insights-cron-cache` | `959dd7886862aabdc269ebc4c5876a96571c42fa` | 2026-06-03 |
| `feat/vlna1-pr2-vercel-crons` | `a7ef9496bf2ba0a70a069be2ef7d05d8fe4e5021` | 2026-06-03 |
| `feat/vlna1-pr3-arbitrage-live` | `d0b227cc92117c515c0b7f1172d0cfdb9bc2df2c` | 2026-06-03 |
| `feat/w-leads-capture` | `5f5e3cdb6e90d65166ad36673564e9a8e8c2253d` | 2026-06-26 |
| `feat/wave0-truthful-pricing-marketing` | `dcbc72661e2a522d9836a78e035d789f4a92b30a` | 2026-06-03 |
| `feat/wave1-export-diagnostics` | `15fad839f4fc1c5af5d2c61082d1d49f26d9b104` | 2026-06-19 |
| `feat/wave1-listing-score` | `db4d56606da0bb7ef2ce6bd26c8f775cca601059` | 2026-06-19 |
| `feat/wave2-k4-playbook-cleanup` | `cf230edd0b0b946b837432f50bc3a4d7baa84849` | 2026-06-20 |
| `feat/workdesk-enterprise-blue-pr2bc` | `4f293859a3c3ce79ba2e3347e64dcc4b8846fa04` | 2026-05-21 |
| `feat/workdesk-full-light-migration` | `32b1598971c1387999eddd559bc1598e7ab2fc3d` | 2026-05-21 |
| `feat/workdesk-intelligence-phase3` | `24525a13c53084ab27ce2abdd70595e1abb9cab0` | 2026-05-21 |
| `feat/workdesk-page-shells-pr35` | `ae95e5f9cf305b952c7a9c9db65f4d6c274b521d` | 2026-05-21 |
| `fix/billing-light-cleanup` | `30d0a93f8f26df1601ea3eef21355807c8e62df4` | 2026-05-21 |
| `fix/ci-stealth-pattern-guard-ap011` | `e34be75860c880e1543f772b2ad7b17e40006734` | 2026-06-18 |
| `fix/crm-smolko-dotenv-init` | `23f2074b289062945b6de3e1ad8d958e1cd693c9` | 2026-06-02 |
| `fix/dashboard-dark-leak` | `ddec5d6b08c16c929d50511475ac1e2e73341f9c` | 2026-05-22 |
| `fix/dashboard-insights-vercel-analytics` | `ce25d191788c8883801f45f74b6b4255f0cf095d` | 2026-06-03 |
| `fix/demo-slate-horizon` | `51ab63744f4c0032b68209814d122c258afc91a5` | 2026-05-22 |
| `fix/executive-ux-panels` | `c01c314f8281fc70eb06aae1c4d8675bde2f2e83` | 2026-05-22 |
| `fix/followup-decisions-agent-column` | `b8b4e7181d0184c1d5c51712a920d07067ae433b` | 2026-06-25 |
| `fix/followup-proxy-cron-bypass` | `fe3827170946c414ee2b91e27750dcd6c98cf958` | 2026-06-25 |
| `fix/forecasting-remove-demo-risk-strip` | `fd05fa9946f42d92e3ea1ddb438fab5d73744b2c` | 2026-06-05 |
| `fix/guardian-cta-deep-link-240` | `6a2f2cf46a0ce7c9914d302df413b5e9d06f55be` | 2026-06-23 |
| `fix/landing-phase3-preview-html` | `29ab0563844922a4c43ebde070b0f450cfc9831c` | 2026-05-22 |
| `fix/landing-slate-horizon-phase2` | `2160e56ef503765c134cadf89c12f9120d722b58` | 2026-05-22 |
| `fix/lead-ai-triage-imported-backfill` | `5b0a71f8e9e681434d585ca70c6ea2a16ce07729` | 2026-06-04 |
| `fix/lead-form-public-prod` | `c1f31561cc03f84a940dcdad6535708c0053d675` | 2026-06-28 |
| `fix/marketing-activate-modal-l99-pricing` | `a507f88ee397b02dfc3d28675d1119865212f947` | 2026-06-02 |
| `fix/marketing-hero-neviete-sk` | `e7040db887f887f0ccf78844b60aca56367e908a` | 2026-06-01 |
| `fix/onboard-agency-prod-schema` | `d8e56c2a01fb8390cb4c2cca117cd293ad999ceb` | 2026-07-11 |
| `fix/p0-sidebar-profile-select` | `634b1e14b73fde4726481de27f761e75fc382fee` | 2026-06-04 |
| `fix/playbook-last-contact-column` | `39507d7da2920cd0576077d8e8ecbad5bbb43ea9` | 2026-06-19 |
| `fix/pr4-scrape-404-proxy-bypass` | `0347b57d3109529fe015d37c3db86cddf1aab06d` | 2026-06-04 |
| `fix/premium-overlay-a11y` | `c881e86ef45ac4b3f7ec1446772ecc3d9276cb6f` | 2026-05-22 |
| `fix/prod-smolko-tenant-hotfix` | `1ef989763dd13417df4334a433b5dfba05f60f85` | 2026-05-29 |
| `fix/proxy-cron-bypass` | `b48157d424377c2a0c9a77b5a84c2f55401efd24` | 2026-05-20 |
| `fix/reality-monopol-test-detector-feature` | `cebf89078fb13d439b4bf303e590272c379c9a97` | 2026-06-03 |
| `fix/resolveTenantSupabase-tasks-team` | `3ee5cdd80eef493660a541e9718022871d67b819` | 2026-06-27 |
| `fix/schema-guard-allowlist-prod-sync` | `0e9e24c7b6ef345b7d1b9a8b49fda45cae4a256a` | 2026-06-24 |
| `fix/segmentation-410-shim` | `96a6bbfeb7126b563a5370d77e906780b75fc7bd` | 2026-06-05 |
| `fix/settings-push-notifications-light` | `654d3e635cbe3bac06f417b5fe6d589a1a66499e` | 2026-05-21 |
| `fix/stealth-recruiter-migration-index` | `f21428c1d9fc7bc33c8b13f3200d13b6a122aea1` | 2026-07-03 |
| `fix/stealth-recruiter-production-presov` | `1b50f705ec2672789412b7ff5d885efbfde8f26c` | 2026-05-29 |
| `fix/stealth-scan-commentitem-preflight` | `56c420c80410e4b0dad888de4fd7b2339dbe49aa` | 2026-07-03 |
| `fix/tenant-isolation-leads-defense` | `497ac44b8d5c179abf95197386aabe4def4c43b7` | 2026-06-18 |
| `fix/triage-availability-prompt-tuning` | `fa122bd55f1a937c9e4c1b65acf5b099df14f4eb` | 2026-07-14 |
| `fix/valuation-widget-property-first-flow` | `25c2cab6775c49bc540706f35e7471d2dfdfa81d` | 2026-07-21 |
| `fix/w-leads-create-rls` | `1e2d2b4217bbac35fe2c4b7af4a30b22960f4fcc` | 2026-06-26 |
| `fix/workdesk-program-comparison-light` | `af23fa2eef1832f3b065f390231d1d66b2fa05b2` | 2026-05-21 |
| `origin` | `76bb31080aa0f6b7a0d77c33e5835402e64ee9ce` | 2026-08-21 |
| `pr/vlna-0.1-cleanup-ui` | `d055a47fd49771d433eb08cc43ddf082fc8cc347` | 2026-06-04 |

## Edge-case policy (before any future delete GO)

| Case | Action |
|------|--------|
| Protected (`main`) | never delete |
| Open PR head | keep until PR closed/merged |
| Closed-unmerged PR / ahead>0 | keep (unique commits vs main) |
| Annotated/lightweight tag on tip | keep (none found tonight) |
| Tip SHA ≠ this table at delete time | **STOP** — branch moved; re-run pack |
| Backup refs `refs/cleanup/2026-08-22/<branch>` | **not pushed tonight**; required immediately before delete |

## Restore command (after backup refs exist)

`git push origin refs/cleanup/2026-08-22/<branch>:refs/heads/<branch>`

## Commands

```
git fetch origin --prune
git rev-parse --is-shallow-repository   # false
git rev-parse origin/main               # 76bb31080aa0f6b7a0d77c33e5835402e64ee9ce
git for-each-ref refs/remotes/origin
git merge-base --is-ancestor <tip> origin/main
git rev-list --count origin/main..<tip>
gh pr list --state open --json headRefName,number
git ls-remote --tags origin
```
