# Revolis.AI — GA4 Analytics Plan

Measurement ID: `G-REVOLIS2026` (placeholder — replace before launch)

---

## 1. Implemented GA4 Events

### preview-homepage.html (13 events)

| Event Name | Parameters | Trigger |
|---|---|---|
| `page_view` | `page_title`, `page_location` | Auto (gtag config) |
| `hero_cta_click` | `cta_text`, `position: 'hero'` | Primary hero button click |
| `hero_cta_click` | `cta_text`, `position: 'nav'` | Nav CTA button click |
| `hero_secondary_click` | `cta_text` | Secondary hero button ("Pozri 2-min demo") |
| `pricing_cta_click` | `plan_name`, `plan_price` | Any pricing "Aktivovať X" button |
| `faq_interaction` | `question` | FAQ accordion open |
| `final_cta_click` | `position: 'footer_cta'` | Final CTA button click |
| `section_view` | `section_name` | IntersectionObserver — first viewport entry per section |
| — `section_name: 'hero'` | — | Hero enters viewport |
| — `section_name: 'features'` | — | Features section enters viewport |
| — `section_name: 'how_it_works'` | — | How it works section enters viewport |
| — `section_name: 'numbers'` | — | Numbers/stats section enters viewport |
| — `section_name: 'pricing'` | — | Pricing section enters viewport |
| — `section_name: 'faq'` | — | FAQ section enters viewport |
| — `section_name: 'final_cta'` | — | Final CTA section enters viewport |
| `time_on_page` | `seconds: 30` | 30s on page |
| `time_on_page` | `seconds: 60` | 60s on page |
| `time_on_page` | `seconds: 120` | 2 min on page |
| `time_on_page` | `seconds: 300` | 5 min on page |

**Unique event names on homepage: 7** (`page_view`, `hero_cta_click`, `hero_secondary_click`, `pricing_cta_click`, `faq_interaction`, `final_cta_click`, `section_view`, `time_on_page`)

---

### preview-demo-page.html (11 events)

| Event Name | Parameters | Trigger |
|---|---|---|
| `page_view` | `page_title`, `page_location` | Auto (gtag config) |
| `demo_cta_click` | `position: 'hero'` | Hero "Spusti živé demo →" or "Pozri 2-min video" button |
| `demo_cta_click` | `position: 'nav'` | Nav "Spusti Demo →" button |
| `final_cta_click` | `position: 'footer_cta'` | Footer CTA "Začni zadarmo" button |
| `demo_section_engaged` | `section: 'radar_chart'` | Radar chart animation triggers (IntersectionObserver) |
| `demo_section_engaged` | `section: 'activity_chart'` | Area chart animation triggers (IntersectionObserver) |
| `exit_intent_shown` | — | Mouse leaves viewport at top (desktop) |
| `exit_intent_submit` | `email_provided: true` | Exit intent form submit (when modal present) |
| `exit_intent_dismissed` | — | Exit intent modal closed |
| `section_view` | `section_name` | IntersectionObserver — first viewport entry per section |
| — `section_name: 'hero'` | — | |
| — `section_name: 'radar_chart'` | — | |
| — `section_name: 'activity_chart'` | — | |
| — `section_name: 'conversation_intelligence'` | — | |
| — `section_name: 'timeline'` | — | |
| — `section_name: 'street_intelligence'` | — | |
| — `section_name: 'final_cta'` | — | |
| `time_on_page` | `seconds: 30` | 30s on page |
| `time_on_page` | `seconds: 60` | 60s on page |
| `time_on_page` | `seconds: 120` | 2 min on page |
| `time_on_page` | `seconds: 300` | 5 min on page |

**Unique event names on demo page: 8** (`page_view`, `demo_cta_click`, `final_cta_click`, `demo_section_engaged`, `exit_intent_shown`, `exit_intent_submit`, `exit_intent_dismissed`, `section_view`, `time_on_page`)

---

## 2. Recommended GA4 Audiences

| Audience Name | Definition | Use Case |
|---|---|---|
| **Visited Pricing** | `section_view` where `section_name = 'pricing'` | Retargeting — highest purchase intent |
| **ROI Calculator User** | `roi_calculator_interaction` (any) | High-intent segment — understands ROI |
| **Demo Engaged 60s+** | `time_on_page` where `seconds >= 60` on demo page | Qualified demo visitors for retargeting |
| **Pricing CTA Clicker** | `pricing_cta_click` (any plan) | Bottom-of-funnel — near conversion |
| **FAQ Reader** | `faq_interaction` (2+ events in session) | Objection-aware — needs reassurance |
| **Full Funnel Viewer** | `section_view` for `hero` + `pricing` + `final_cta` in same session | Highest-value lead profile |
| **Exit Intent Shown** | `exit_intent_shown` | Recover abandoning visitors |
| **Demo Super Engaged** | `time_on_page` >= 120s AND `demo_section_engaged` (2+ events) | Demo page power users |

---

## 3. Priority Conversion Goals (GA4 Conversions)

1. **Primary — Pricing CTA Click**
   - Event: `pricing_cta_click`
   - Rationale: Direct purchase intent. Most valuable bottom-of-funnel action.

2. **Primary — Final CTA Click**
   - Event: `final_cta_click` where `position = 'footer_cta'`
   - Rationale: Full-page scroll + intent = highest-quality lead.

3. **Secondary — Demo CTA Click**
   - Event: `demo_cta_click`
   - Rationale: Entering product experience = qualified lead.

4. **Engagement — Hero CTA Click**
   - Event: `hero_cta_click` where `position = 'hero'`
   - Rationale: First funnel step — measures ad-to-interest conversion.

5. **Retention — Time on Page 120s+**
   - Event: `time_on_page` where `seconds = 120`
   - Rationale: 2-min engagement correlates with trial registration intent.

---

## 4. Recommended GA4 Funnel

**Primary Conversion Funnel — Pricing Path**

```
Step 1: page_view (homepage)
   ↓
Step 2: section_view { section_name: 'hero' }
   ↓
Step 3: section_view { section_name: 'pricing' }
   ↓
Step 4: pricing_cta_click (any plan)
   ↓
Step 5: [Off-site] Trial registration / checkout
```

**Secondary Funnel — Demo Engagement Path**

```
Step 1: page_view (demo page)
   ↓
Step 2: demo_section_engaged { section: 'radar_chart' }
   ↓
Step 3: time_on_page { seconds: 60 }
   ↓
Step 4: demo_cta_click { position: 'hero' }
   ↓
Step 5: [Redirect] Homepage pricing section
```

---

## 5. UTM Tracking Structure

Recommended UTM parameters for Revolis.AI campaigns:

| Channel | utm_source | utm_medium | utm_campaign |
|---|---|---|---|
| LinkedIn Ads | `linkedin` | `paid_social` | `launch_q1_2026` |
| Google Ads | `google` | `cpc` | `realitka_sk_brand` |
| Email Campaign | `mailchimp` | `email` | `segment_a_outreach` |
| Organic Social | `instagram` | `social` | `organic_demo` |
| Referral / Partners | `partner_name` | `referral` | `agency_network` |

UTM data is captured in `sessionStorage` under key `utm_data` and set as GA4 user properties (`utm_source`, `utm_campaign`) for cross-session attribution.

---

## 6. Implementation Notes

- GA4 base script is in `<head>` on both pages — ensures page_view fires before any user interaction.
- All event calls are guarded with `typeof gtag !== 'undefined'` to prevent errors if script fails to load (ad blockers, slow network).
- UTM capture runs immediately in `<head>` so parameters are stored even if user bounces before any interaction.
- `section_view` uses `IntersectionObserver` with `threshold: 0.3` — fires when 30% of section is visible. Each section fires only once per page load (`fired` Set).
- `time_on_page` milestones: 30s / 60s / 120s / 300s — align with GA4 engagement_time standard buckets.
- Pricing CTA tracking extracts `plan_name` and `plan_price` from DOM at click time — survives any future copy changes.
- Exit intent fires on `mouseleave` with `clientY <= 0` (desktop only). Wired to `#exitIntentModal` — add modal to DOM when ready.
