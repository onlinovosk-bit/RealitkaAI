# Inbound lead — stop invented criteria

**PR:** `fix(leads): stop writing invented criteria on inbound leads`

## Fixed (AP-001)
- `property_type: "Byt"` → `""`
- `financing: "Hypotéka"` → `""`

## Fields still set without user input (system defaults — listed in PR)
| Field | Value | Note |
|---|---|---|
| `id` | UUID | system |
| `agency_id` | from slug/token | auth |
| `status` | `"Nový"` | workflow default |
| `score` | `50` | default score |
| `assigned_agent` | `"Nepriradený"` | system |
| `assigned_profile_id` | `null` | system |
| `last_contact` | `"Práve vytvorený"` | system |
| `source` | `"web_form"` | channel label |
| `location`, `budget`, `rooms`, `timeline` | `""` | honest empty |
| `name`, `email`, `phone`, `note` | from form | user input |

No new form fields added (conversion tradeoff = founder decision).
