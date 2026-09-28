---
title: "Agentic System Blueprint v1.0"
project: cross-product (Revolis.AI · Onlinovo.sk · MIA Vellar · AI Phone Operator)
type: architecture-constitution
status: canonical
version: 1.0
adopted: 2026-09-24
adopted_by: founder GO (2026-09-24)
related:
  - "[[revolis-system-spec-v1.0]]"
  - "[[revolis-constitution-v2]]"
  - "[[RRA-REFERENCE-ARCHITECTURE]]"
---

> **Repo poznámka (nie súčasť originálu):** Text nižšie je founderom schválený
> Blueprint v1.0, prevzatý **doslovne**. V tomto repozitári sa uplatňuje len
> §17.1 (Revolis.AI). Jeho aplikácia na reálny kód je v
> [`revolis-system-spec-v1.0.md`](./revolis-system-spec-v1.0.md). Blueprint je
> *kontrakt* (čo musí platiť), nie povolenie stavať novú infraštruktúru —
> RRA a AP-012 (Architecture Inflation) platia ďalej. Poradie, ktoré §21
> predpisuje, prechádza Ústavou v2 pri každom kroku.

# AGENTIC SYSTEM BLUEPRINT v1.0

**Status:** Canonical architecture\
**Version:** 1.0\
**Date:** 2026-09-24\
**Purpose:** Vendor-neutral foundation for building production-grade
agentic systems.

------------------------------------------------------------------------

## 1. Executive Definition

An **Agentic System** is not a prompt and not merely an AI agent.

It is a governed software system composed of:

-   Agent Specification
-   Prompt Stack
-   Skills
-   Tools / MCP
-   Memory
-   Orchestration
-   Events
-   Governance
-   Evals
-   Observability
-   Runtime
-   Human approval boundaries

The system must be designed so that the **business logic and safety
model remain independent of the runtime vendor**.

Anthropic Managed Agents may be the first runtime implementation, but it
is an adapter, not the architecture itself.

------------------------------------------------------------------------

## 2. Canonical Architecture

``` text
                    AGENTIC SYSTEM
                          │
              ┌───────────┴───────────┐
              │                       │
          CONTROL PLANE          EXECUTION PLANE
              │                       │
     ┌────────┼────────┐       ┌──────┼────────┐
     │        │        │       │      │        │
   Spec   Governance  Evals  Agent  Skills  Tools/MCP
     │        │        │       │      │        │
     └────────┴────────┴───────┴──────┴────────┘
                          │
                    Memory / Context
                          │
                    Event / BUS Layer
                          │
                    Runtime Adapter
                          │
          ┌───────────────┴───────────────┐
          │                               │
   Managed Agent Runtime          Other Runtime
```

### Principle

**Control Plane decides what is allowed.\
Execution Plane performs the work.**

An agent must never be able to redefine its own safety boundary.

------------------------------------------------------------------------

# 3. The Agentic System Layers

## L0 --- Mission

Defines:

-   why the system exists
-   who it serves
-   desired business outcome
-   explicit non-goals
-   success criteria

Every system must have one canonical Mission.

------------------------------------------------------------------------

## L1 --- Agent Specification

The Agent Spec is the contract for an agent.

Minimum fields:

``` yaml
agent_id:
version:
mission:
role:
inputs:
outputs:
allowed_actions:
forbidden_actions:
required_tools:
required_skills:
memory_policy:
approval_policy:
failure_policy:
success_criteria:
evaluation_suite:
```

The Agent Spec is authoritative over prompts.

------------------------------------------------------------------------

## L2 --- Prompt Stack

The Prompt Stack is the executable behavioral layer.

Recommended structure:

``` text
00_identity
01_mission
02_context
03_rules
04_reasoning_policy
05_workflow
06_tools
07_memory
08_output_contract
09_failure_handling
10_escalation
11_examples
```

Prompts must not contain hidden safety assumptions that are absent from
the Agent Spec.

------------------------------------------------------------------------

## L3 --- Skills

Skills are reusable capabilities.

Examples:

``` text
research
classification
lead_triage
content_creation
data_analysis
customer_service
sales_followup
document_processing
quality_control
```

A skill should have:

-   purpose
-   inputs
-   procedure
-   tools
-   output schema
-   failure modes
-   evals

Skills are composable and versioned.

------------------------------------------------------------------------

## L4 --- Tools / MCP

Tools are the agent's action surface.

Every tool must declare:

``` yaml
tool:
purpose:
inputs:
outputs:
permissions:
side_effects:
risk_level:
authentication:
approval_required:
rollback:
audit_event:
```

### Tool principle

**Read is not Write.\
Write is not Execute.\
Execute is not Irreversible Execute.**

Higher-risk actions require stronger authorization.

------------------------------------------------------------------------

# 4. Memory Architecture

Memory is divided into four categories:

### Working Memory

Short-lived context for the current task.

### Episodic Memory

What happened during previous interactions.

### Semantic Memory

Stable facts, business knowledge and learned relationships.

### Policy Memory

Rules, constraints and approved operating boundaries.

Policy Memory has higher authority than learned memory.

The system must never silently convert an agent's inference into
authoritative memory.

------------------------------------------------------------------------

# 5. Orchestration

The orchestrator determines:

-   which agent acts
-   when it acts
-   which skill it uses
-   which tools it may call
-   when to retry
-   when to stop
-   when to escalate

Canonical loop:

``` text
INTAKE
  ↓
UNDERSTAND
  ↓
PLAN
  ↓
CHECK PERMISSIONS
  ↓
EXECUTE
  ↓
OBSERVE
  ↓
EVALUATE
  ↓
CONTINUE / RETRY / ESCALATE / COMPLETE
```

The loop must have explicit termination conditions.

------------------------------------------------------------------------

# 6. Event Architecture

Agents communicate through structured events rather than uncontrolled
free-form messaging.

Canonical event:

``` json
{
  "event_id": "...",
  "event_type": "...",
  "source": "...",
  "target": "...",
  "timestamp": "...",
  "correlation_id": "...",
  "payload": {},
  "risk_level": "...",
  "requires_approval": false
}
```

Events must be:

-   traceable
-   auditable
-   idempotent where possible
-   versioned
-   attributable to an agent/action

------------------------------------------------------------------------

# 7. Governance

Governance is a hard control layer.

It defines:

-   permissions
-   action limits
-   approval gates
-   secrets access
-   data access
-   spending limits
-   rate limits
-   escalation
-   emergency stop

### Absolute rule

An autonomous agent may optimize **inside** its approved operating
envelope.

It may not:

-   expand its own permissions
-   remove safety controls
-   increase approved risk limits
-   disable hard stops
-   alter governance rules
-   grant itself new capabilities

Any such change requires an external approval boundary.

------------------------------------------------------------------------

# 8. Human Approval Gates

Actions are classified:

### Tier 0 --- Informational

No approval.

### Tier 1 --- Reversible

Agent may act within predefined limits.

### Tier 2 --- Material

Approval may be required depending on policy.

### Tier 3 --- Irreversible / High Risk

Mandatory human approval.

Examples:

``` text
send message
modify customer data
publish content
issue refund
place financial order
change production configuration
delete data
change security policy
change capital/risk limits
```

The exact classification is system-specific.

------------------------------------------------------------------------

# 9. Evals

A production agent is not considered reliable because a prompt "looks
good".

Every agent requires:

``` text
UNIT TESTS
    ↓
BEHAVIOR EVALS
    ↓
TOOL EVALS
    ↓
ADVERSARIAL TESTS
    ↓
REGRESSION TESTS
    ↓
PRODUCTION MONITORING
```

Evals must test both:

-   desired behavior
-   prohibited behavior

A green test suite is evidence, not absolute proof.

------------------------------------------------------------------------

# 10. Red Team

Every important system requires adversarial testing.

Red-team objectives:

-   find permission escalation
-   induce tool misuse
-   bypass approval gates
-   corrupt memory
-   exploit prompt injection
-   create unsafe loops
-   induce data leakage
-   exploit ambiguous instructions
-   test failure recovery

Findings must be classified and tracked to closure.

------------------------------------------------------------------------

# 11. Observability

Every meaningful action should be traceable.

Minimum telemetry:

``` text
agent_id
agent_version
prompt_version
skill_version
tool
tool_version
event_id
correlation_id
input class
action
result
latency
cost
failure
approval state
```

The system should allow reconstruction of:

> What happened, why it happened, what the agent knew, what it was
> allowed to do, and what it actually did.

------------------------------------------------------------------------

# 12. Security

Security is part of architecture, not an add-on.

Requirements:

-   least privilege
-   isolated secrets
-   scoped credentials
-   environment separation
-   encrypted transport
-   audit logs
-   explicit data boundaries
-   tool allowlists
-   input validation
-   output validation

Secrets must never be placed directly into prompts.

------------------------------------------------------------------------

# 13. Runtime Adapter

The Agentic System must not depend directly on one vendor.

Canonical interface:

``` text
Agent System
     ↓
Runtime Adapter
     ↓
┌─────────────────────┐
│ Anthropic Managed   │
│ Agents              │
└─────────────────────┘

or

┌─────────────────────┐
│ Custom Agent Loop   │
└─────────────────────┘

or

┌─────────────────────┐
│ Future Runtime      │
└─────────────────────┘
```

For the first implementation, Anthropic Managed Agents can provide:

-   agent runtime
-   sessions
-   environments
-   event handling
-   tool execution

The architecture above it remains vendor-neutral.

------------------------------------------------------------------------

# 14. Agent Factory

The Agent Factory is the standardized production pipeline.

``` text
BUSINESS REQUIREMENT
        ↓
SYSTEM SPEC
        ↓
AGENT SPEC
        ↓
PROMPT STACK
        ↓
SKILLS
        ↓
TOOLS / MCP
        ↓
MEMORY
        ↓
GOVERNANCE
        ↓
EVAL SUITE
        ↓
RED TEAM
        ↓
RUNTIME DEPLOYMENT
        ↓
OBSERVABILITY
        ↓
ITERATION
```

No production agent should bypass this pipeline without an explicit
exception.

------------------------------------------------------------------------

# 15. Definition of Done

An agent is not "done" when it runs.

It is done when:

-   Mission is defined
-   Agent Spec exists
-   Prompt Stack is versioned
-   Skills are defined
-   Tools are permissioned
-   Memory policy exists
-   Governance exists
-   Approval boundaries exist
-   Evals exist
-   Red-team tests pass or accepted exceptions exist
-   Observability exists
-   Failure behavior is defined
-   Deployment is reproducible
-   Rollback exists
-   Owner is defined

------------------------------------------------------------------------

# 16. System Specification Template

Every new product begins with:

``` text
SYSTEM NAME
SYSTEM ID
VERSION

MISSION

USERS

BUSINESS OUTCOME

NON-GOALS

AGENTS

SKILLS

TOOLS / MCP

MEMORY

EVENTS

ORCHESTRATION

GOVERNANCE

HUMAN APPROVAL

SECURITY

EVALS

RED TEAM

OBSERVABILITY

RUNTIME

DEPLOYMENT

SUCCESS METRICS

DEFINITION OF DONE
```

------------------------------------------------------------------------

# 17. The Four Initial Systems

## 17.1 Revolis.AI

**System:** Agentic Real Estate CRM System

Primary domain:

``` text
leads
contacts
properties
activities
tasks
pipeline
customer intelligence
sales workflows
```

The agentic layer operates inside the CRM's existing business and
permission model.

------------------------------------------------------------------------

## 17.2 Onlinovo.sk

**System:** Agentic E-commerce System

Primary domain:

``` text
products
orders
customers
marketing
SEO
analytics
inventory
revenue
content
```

The system should connect business data and operational workflows
through controlled tools.

------------------------------------------------------------------------

## 17.3 MIA Vellar

**System:** Agentic Character & Content System

Primary domain:

``` text
character identity
content planning
content production
publishing
audience interaction
memory
brand consistency
monetization workflows
```

Character identity and policy memory must remain authoritative over
generated content.

------------------------------------------------------------------------

## 17.4 AI Phone Operator

**System:** Agentic Voice Business Operator

This is a **standalone product**.

Canonical flow:

``` text
PHONE CALL
    ↓
VOICE / SPEECH
    ↓
CALL UNDERSTANDING
    ↓
INTENT
    ↓
BUSINESS KNOWLEDGE
    ↓
CUSTOMER CONTEXT
    ↓
AGENT
    ↓
TOOLS
    ↓
ACTION
    ↓
CALL RESPONSE
    ↓
SUMMARY
    ↓
FOLLOW-UP / CRM
```

Potential capabilities:

-   answer missed calls
-   identify caller intent
-   answer business questions
-   book appointments
-   collect customer details
-   route calls
-   send follow-up messages
-   create CRM records
-   summarize calls

For regulated or high-risk domains such as healthcare, additional
privacy, consent, escalation and human-handoff controls are mandatory.

------------------------------------------------------------------------

# 18. Naming & Versioning

Recommended:

``` text
SYSTEM-ID
AGENT-ID
SKILL-ID
TOOL-ID
PROMPT-ID
EVAL-ID
```

All executable components are versioned.

Example:

``` text
PHONE-OPERATOR
PHONE-OPERATOR-CALL-AGENT
SKILL-BOOK-APPOINTMENT
TOOL-CALENDAR-CREATE
PROMPT-CALL-CORE
EVAL-CALL-BOOKING
```

------------------------------------------------------------------------

# 19. Core Architectural Laws

### Law 1

**Specification precedes implementation.**

### Law 2

**Governance precedes autonomy.**

### Law 3

**Permissions are external to the agent's reasoning.**

### Law 4

**Memory is not automatically truth.**

### Law 5

**Tools are capabilities, not permissions.**

### Law 6

**Every autonomous loop needs termination conditions.**

### Law 7

**Every important action must be observable.**

### Law 8

**Every production agent must be evaluable.**

### Law 9

**The runtime must not own the business architecture.**

### Law 10

**An agent may optimize inside its approved envelope, never expand it.**

------------------------------------------------------------------------

# 20. Target End State

The long-term architecture is:

``` text
                  AGENTIC SYSTEM BLUEPRINT
                           │
          ┌────────────────┼────────────────┐
          │                │                │
      REVOLIS          ONLINOVO         MIA VELLAR
          │                │                │
          └────────────────┼────────────────┘
                           │
                    AI PHONE OPERATOR
                    (standalone system)
                           │
                           ↓
                    AGENT FACTORY
                           │
          ┌────────────────┼────────────────┐
          │                │                │
      Prompt Stacks      Skills          Tools/MCP
          │                │                │
          └────────────────┼────────────────┘
                           │
                    Governance + Evals
                           │
                    Runtime Adapter
                           │
                Anthropic Managed Agents
```

The result is not four unrelated AI projects.

It is **one reusable Agentic System architecture producing four
specialized systems**.

------------------------------------------------------------------------

# 21. Next Implementation Sequence

The canonical sequence after this Blueprint is:

``` text
AGENTIC SYSTEM BLUEPRINT v1.0
              ↓
REVOLIS SYSTEM SPEC v1.0
              ↓
ONLINOVO SYSTEM SPEC v1.0
              ↓
MIA VELLAR SYSTEM SPEC v1.0
              ↓
AI PHONE OPERATOR SYSTEM SPEC v1.0
              ↓
AGENT FACTORY v1.0
              ↓
FIRST AGENT
              ↓
EVALS + RED TEAM
              ↓
MANAGED AGENT RUNTIME
              ↓
PRODUCTION
```

**The Blueprint is the constitution of the architecture.\
The System Specs are the designs.\
The Agent Factory is the manufacturing process.\
The Runtime is where the agents actually execute.**
