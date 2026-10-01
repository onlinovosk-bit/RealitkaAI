# ORCHESTRATOR CARD — Smolko Website Concierge

Skopíruj do task kontraktu / ledger runu.

```json
{
  "stack_id": "SMO-CONCIERGE-M1-M2",
  "root": "docs/prompts/smolko-website-concierge/",
  "milestones": ["M1-read-mvp", "M2-booking"],
  "waves": [
    {
      "id": "W0",
      "nodes": ["N00"],
      "mode": "AUDIT_OR_EXEC",
      "parallel": false
    },
    {
      "id": "W1",
      "nodes": ["N01", "N04", "N05", "N06"],
      "mode": "EXEC_AFTER_GO_W1",
      "parallel": true,
      "note": "N04 may be HUMAN if no prod SQL access"
    },
    {
      "id": "W2",
      "nodes": ["N07"],
      "mode": "EXEC_AFTER_GO",
      "requires": ["N04.B04_PROD=PASS", "GO-B05-COPY", "GO-B06-ROUTING", "GO-W3-SHIP"],
      "parallel": false
    },
    {
      "id": "W3",
      "nodes": ["N08", "N09", "N10"],
      "mode": "SERIAL",
      "requires": ["M1"],
      "gates": ["GO-B07-DB", "GO-B08-OAUTH"]
    }
  ],
  "prompt_stack_template": {
    "S0": ["docs/prompts/runner/00-system.md", "docs/prompts/smolko-website-concierge/S0-system.md"],
    "S1": ["docs/prompts/smolko-website-concierge/S1-project.md"],
    "S2_S7": "docs/prompts/smolko-website-concierge/nodes/<NODE>.md"
  },
  "out_of_scope": ["SMO-B01", "SMO-B02", "SMO-B03", "SMO-B10"]
}
```
