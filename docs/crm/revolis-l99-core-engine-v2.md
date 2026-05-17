# REVOLIS.AI L99 CORE ENGINE MANIFEST v2.0
# Internal Code: "PROJECT EXCALIBUR"
# Claude Code Prompt – Staff-level implementation
# Strict mode: Types → Backend → Frontend → Tests → Deploy

---

## ENV VARIABLES (povinné pred spustením)

```bash
# Existujúce:
OPENAI_API_KEY=...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Nové – pridaj do .env.local + Vercel dashboard:
TWILIO_ACCOUNT_SID=...          # Pre SMS priority alerts
TWILIO_AUTH_TOKEN=...           # Pre SMS priority alerts
TWILIO_FROM_NUMBER=+421...      # Twilio phone number
```

---

## KROK 0 – SQL MIGRÁCIA (Supabase SQL Editor)

```sql
-- 1. Enterprise tier stĺpec do profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS account_tier TEXT DEFAULT 'free'
    CHECK (account_tier IN ('free', 'starter', 'pro', 'enterprise')),
  ADD COLUMN IF NOT EXISTS tier_locked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tier_downgraded_from TEXT;

-- 2. BRI History tabuľka
CREATE TABLE IF NOT EXISTS bri_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id),
  bri_score DECIMAL(5,2) NOT NULL CHECK (bri_score BETWEEN 0 AND 100),
  -- Váhy komponentov
  sofia_engagement_velocity DECIMAL(5,2) DEFAULT 0,
  sentiment_score DECIMAL(5,2) DEFAULT 0,
  cross_property_intent DECIMAL(5,2) DEFAULT 0,
  market_scarcity_factor DECIMAL(5,2) DEFAULT 0,
  -- Explainability (EU AI Act)
  reasoning_string TEXT NOT NULL,
  reasoning_factors JSONB DEFAULT '[]',
  -- Meta
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  tier_at_calculation TEXT DEFAULT 'enterprise'
);

-- 3. Shadow Inventory tabuľka
CREATE TABLE IF NOT EXISTS shadow_inventory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL,
  lead_id UUID REFERENCES leads(id),
  property_id UUID REFERENCES properties(id),
  signal_type TEXT NOT NULL
    CHECK (signal_type IN (
      'dormant_revival',
      'predictive_relisting',
      'hidden_match',
      'life_stage_trigger'
    )),
  confidence_score DECIMAL(5,2) CHECK (confidence_score BETWEEN 0 AND 100),
  life_stage_trigger TEXT,
  -- Napr. 'marriage', 'new_child', 'job_change', 'divorce'
  ai_reasoning TEXT NOT NULL,
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'alerted', 'acted', 'dismissed')),
  property_listed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  alerted_at TIMESTAMPTZ,
  acted_at TIMESTAMPTZ
);

-- 4. Priority Alerts log
CREATE TABLE IF NOT EXISTS priority_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id),
  agent_id UUID REFERENCES profiles(id),
  bri_score DECIMAL(5,2),
  alert_type TEXT NOT NULL
    CHECK (alert_type IN ('sms', 'push', 'email', 'in_app')),
  message TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivered BOOLEAN DEFAULT FALSE,
  deal_summary_pdf_url TEXT
);

-- 5. RLS Policies
ALTER TABLE bri_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE shadow_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE priority_alerts ENABLE ROW LEVEL SECURITY;

-- Enterprise only
CREATE POLICY "Enterprise BRI access" ON bri_history
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE auth_user_id = auth.uid()
      AND account_tier = 'enterprise'
    )
  );

-- Downgrade: Read-only pre locked accounts
CREATE POLICY "Locked BRI read-only" ON bri_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE auth_user_id = auth.uid()
      AND tier_locked_at IS NOT NULL
    )
  );

CREATE POLICY "Enterprise Shadow Inventory" ON shadow_inventory
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE auth_user_id = auth.uid()
      AND account_tier = 'enterprise'
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bri_lead ON bri_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_bri_score ON bri_history(bri_score DESC);
CREATE INDEX IF NOT EXISTS idx_shadow_agency ON shadow_inventory(agency_id);
CREATE INDEX IF NOT EXISTS idx_shadow_signal ON shadow_inventory(signal_type);
```

---

## KROK 1 – TYPES (src/lib/l99/types.ts)

```typescript
// NOVÝ SÚBOR – všetky L99 typy

export const ACCOUNT_TIERS = {
  FREE: 'free',
  STARTER: 'starter',
  PRO: 'pro',
  ENTERPRISE: 'enterprise',
} as const;

export type AccountTier = typeof ACCOUNT_TIERS[keyof typeof ACCOUNT_TIERS];

// BRI váhy – musia sumarizovať na 1.0
export const BRI_WEIGHTS = {
  SOFIA_ENGAGEMENT_VELOCITY: 0.35,
  SENTIMENT_SCORE: 0.25,
  CROSS_PROPERTY_INTENT: 0.20,
  MARKET_SCARCITY_FACTOR: 0.20,
} as const satisfies Record<string, number>;

// Validácia súčtu váh
const weightsSum = Object.values(BRI_WEIGHTS).reduce((a, b) => a + b, 0);
if (Math.abs(weightsSum - 1.0) > 0.001) {
  throw new Error(`BRI_WEIGHTS must sum to 1.0, got ${weightsSum}`);
}

export type BriComponents = {
  sofiaEngagementVelocity: number; // 0-100
  sentimentScore: number;          // 0-100
  crossPropertyIntent: number;     // 0-100
  marketScarcityFactor: number;    // 0-100
};

export type BriResult = {
  score: number;                   // 0-100, váhovaný priemer
  components: BriComponents;
  reasoningString: string;         // EU AI Act compliance
  reasoningFactors: ReasoningFactor[];
  alertLevel: BriAlertLevel;
  calculatedAt: string;
};

export type ReasoningFactor = {
  factor: string;
  value: number;
  weight: number;
  contribution: number;
  explanation: string;
};

export type BriAlertLevel =
  | 'low'       // < 70
  | 'medium'    // 70-87
  | 'high'      // 88-89 → priority_alert
  | 'critical'; // 90+ → Deal Summary PDF

export type ShadowInventorySignal = {
  id: string;
  leadId: string | null;
  propertyId: string | null;
  signalType: 'dormant_revival' | 'predictive_relisting' | 'hidden_match' | 'life_stage_trigger';
  confidenceScore: number;
  lifeStageTrigger: string | null;
  aiReasoning: string;
  status: 'pending' | 'alerted' | 'acted' | 'dismissed';
  createdAt: string;
};

export type EnterpriseFeatureCheck = {
  allowed: boolean;
  reason: 'ok' | 'wrong_tier' | 'locked_downgrade' | 'no_profile';
  currentTier: AccountTier;
  isLocked: boolean;
};
```

---

## KROK 2 – ENTITLEMENT ENGINE (src/lib/l99/entitlements.ts)

```typescript
import { createClient } from "@/lib/supabase/server";
import { ACCOUNT_TIERS, type AccountTier, type EnterpriseFeatureCheck } from "./types";

// Type-safe tier check – žiadne magic strings
export async function checkEnterpriseAccess(): Promise<EnterpriseFeatureCheck> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return {
      allowed: false,
      reason: 'no_profile',
      currentTier: ACCOUNT_TIERS.FREE,
      isLocked: false,
    };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('account_tier, tier_locked_at')
    .eq('auth_user_id', user.id)
    .single();

  if (!profile) {
    return {
      allowed: false,
      reason: 'no_profile',
      currentTier: ACCOUNT_TIERS.FREE,
      isLocked: false,
    };
  }

  const tier = profile.account_tier as AccountTier;
  const isLocked = Boolean(profile.tier_locked_at);

  // Downgrade: data locked, scoring stops
  if (isLocked) {
    return {
      allowed: false,
      reason: 'locked_downgrade',
      currentTier: tier,
      isLocked: true,
    };
  }

  if (tier !== ACCOUNT_TIERS.ENTERPRISE) {
    return {
      allowed: false,
      reason: 'wrong_tier',
      currentTier: tier,
      isLocked: false,
    };
  }

  return {
    allowed: true,
    reason: 'ok',
    currentTier: ACCOUNT_TIERS.ENTERPRISE,
    isLocked: false,
  };
}

// Helper pre Server Actions
export async function requireEnterprise(): Promise<void> {
  const check = await checkEnterpriseAccess();
  if (!check.allowed) {
    throw new Error(
      check.reason === 'locked_downgrade'
        ? 'Enterprise data je zamknuté. Obnoviť Enterprise plán pre obnovenie prístupu.'
        : 'Táto funkcia vyžaduje Enterprise plán.'
    );
  }
}
```

---

## KROK 3 – BRI ENGINE (src/lib/l99/bri-engine.ts)

```typescript
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import { requireEnterprise } from "./entitlements";
import {
  BRI_WEIGHTS,
  type BriComponents,
  type BriResult,
  type BriAlertLevel,
  type ReasoningFactor,
} from "./types";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Výpočet BRI skóre
export function calculateBriScore(components: BriComponents): number {
  return Math.round(
    components.sofiaEngagementVelocity * BRI_WEIGHTS.SOFIA_ENGAGEMENT_VELOCITY +
    components.sentimentScore          * BRI_WEIGHTS.SENTIMENT_SCORE +
    components.crossPropertyIntent     * BRI_WEIGHTS.CROSS_PROPERTY_INTENT +
    components.marketScarcityFactor    * BRI_WEIGHTS.MARKET_SCARCITY_FACTOR
  );
}

// Alert level podľa skóre
export function getBriAlertLevel(score: number): BriAlertLevel {
  if (score >= 90) return 'critical'; // → Deal Summary PDF
  if (score >= 88) return 'high';     // → Priority Alert SMS
  if (score >= 70) return 'medium';
  return 'low';
}

// Reasoning factors pre EU AI Act
function buildReasoningFactors(components: BriComponents): ReasoningFactor[] {
  return [
    {
      factor: 'Sofia Engagement Velocity',
      value: components.sofiaEngagementVelocity,
      weight: BRI_WEIGHTS.SOFIA_ENGAGEMENT_VELOCITY,
      contribution: Math.round(
        components.sofiaEngagementVelocity * BRI_WEIGHTS.SOFIA_ENGAGEMENT_VELOCITY
      ),
      explanation: `Frekvencia a rýchlosť odpovedí cez Sofia AI (${components.sofiaEngagementVelocity}/100)`,
    },
    {
      factor: 'Sentiment Score',
      value: components.sentimentScore,
      weight: BRI_WEIGHTS.SENTIMENT_SCORE,
      contribution: Math.round(
        components.sentimentScore * BRI_WEIGHTS.SENTIMENT_SCORE
      ),
      explanation: `NLP analýza verbálneho zámeru v komunikácii (${components.sentimentScore}/100)`,
    },
    {
      factor: 'Cross-Property Intent',
      value: components.crossPropertyIntent,
      weight: BRI_WEIGHTS.CROSS_PROPERTY_INTENT,
      contribution: Math.round(
        components.crossPropertyIntent * BRI_WEIGHTS.CROSS_PROPERTY_INTENT
      ),
      explanation: `Správanie naprieč rôznymi inzerátmi (${components.crossPropertyIntent}/100)`,
    },
    {
      factor: 'Market Scarcity Factor',
      value: components.marketScarcityFactor,
      weight: BRI_WEIGHTS.MARKET_SCARCITY_FACTOR,
      contribution: Math.round(
        components.marketScarcityFactor * BRI_WEIGHTS.MARKET_SCARCITY_FACTOR
      ),
      explanation: `Kontextová urgencia na základe rýchlosti lokálneho trhu (${components.marketScarcityFactor}/100)`,
    },
  ];
}

// AI generovaný reasoning string (EU AI Act compliance)
async function generateReasoningString(
  components: BriComponents,
  score: number,
  leadContext: { name: string; lastActivity: string }
): Promise<string> {
  const prompt = `
Vygeneruj stručný, transparentný vysvetľovací text (max 2 vety, slovensky) prečo
príležitosť "${leadContext.name}" dostala Buyer Readiness Index skóre ${score}/100.

Komponenty:
- Sofia Engagement Velocity: ${components.sofiaEngagementVelocity}/100
- Sentiment Score: ${components.sentimentScore}/100
- Cross-Property Intent: ${components.crossPropertyIntent}/100
- Market Scarcity Factor: ${components.marketScarcityFactor}/100
- Posledná aktivita: ${leadContext.lastActivity}

Formát: "Príležitosť označená ako [úroveň] (${score}) z dôvodu [hlavný faktor] a [vedľajší faktor]."
Buď konkrétny a merateľný. Žiadne generické frázy.
`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 150,
    temperature: 0.2,
  });

  return response.choices[0]?.message?.content?.trim() ??
    `Príležitosť hodnotená na ${score}/100 na základe AI analýzy správania.`;
}

// Hlavná BRI kalkulácia
export async function computeEnterpriseBri(
  leadId: string,
  components: BriComponents,
  leadContext: { name: string; lastActivity: string }
): Promise<BriResult> {
  await requireEnterprise();

  const score = calculateBriScore(components);
  const alertLevel = getBriAlertLevel(score);
  const reasoningFactors = buildReasoningFactors(components);
  const reasoningString = await generateReasoningString(components, score, leadContext);

  const result: BriResult = {
    score,
    components,
    reasoningString,
    reasoningFactors,
    alertLevel,
    calculatedAt: new Date().toISOString(),
  };

  // Uložiť do BRI history
  const supabase = await createClient();
  await supabase.from('bri_history').insert({
    lead_id: leadId,
    bri_score: score,
    sofia_engagement_velocity: components.sofiaEngagementVelocity,
    sentiment_score: components.sentimentScore,
    cross_property_intent: components.crossPropertyIntent,
    market_scarcity_factor: components.marketScarcityFactor,
    reasoning_string: reasoningString,
    reasoning_factors: reasoningFactors,
  });

  // Spustiť akcie podľa alert level
  if (alertLevel === 'high' || alertLevel === 'critical') {
    await dispatchPriorityAlert(leadId, score, reasoningString);
  }

  return result;
}
```

---

## KROK 4 – PRIORITY ALERT DISPATCH (src/lib/l99/alert-dispatch.ts)

```typescript
import twilio from "twilio";
import { createClient } from "@/lib/supabase/server";

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function dispatchPriorityAlert(
  leadId: string,
  briScore: number,
  reasoningString: string
): Promise<void> {
  const supabase = await createClient();

  // Načítaj lead a agenta
  const { data: lead } = await supabase
    .from('leads')
    .select('name, profile_id, profiles(phone, full_name)')
    .eq('id', leadId)
    .single();

  if (!lead) return;

  const agentPhone = (lead.profiles as { phone: string })?.phone;
  const agentName = (lead.profiles as { full_name: string })?.full_name;
  const alertType = briScore >= 90 ? 'critical' : 'high';

  const message = briScore >= 90
    ? `🔥 REVOLIS.AI CRITICAL: ${lead.name} dosiahol BRI ${briScore}/100. ${reasoningString} Zavolaj IHNEĎ.`
    : `⚡ REVOLIS.AI: ${lead.name} má BRI ${briScore}/100 – vysoká priorita. ${reasoningString}`;

  // SMS cez Twilio (ak má agent telefón)
  if (agentPhone) {
    try {
      await twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_FROM_NUMBER!,
        to: agentPhone,
      });
    } catch (err) {
      console.error('SMS dispatch failed:', err);
    }
  }

  // Uložiť alert do logu
  await supabase.from('priority_alerts').insert({
    lead_id: leadId,
    bri_score: briScore,
    alert_type: agentPhone ? 'sms' : 'in_app',
    message,
    delivered: Boolean(agentPhone),
  });
}
```

---

## KROK 5 – SHADOW INVENTORY ENGINE (src/lib/l99/shadow-inventory.ts)

```typescript
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import { requireEnterprise } from "./entitlements";
import type { ShadowInventorySignal } from "./types";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const LIFE_STAGE_TRIGGERS = [
  'sobáš', 'rozvod', 'nové dieťa', 'zmena práce',
  'odchod do dôchodku', 'dedičstvo', 'presťahovanie',
] as const;

export type LifeStageTrigger = typeof LIFE_STAGE_TRIGGERS[number];

// Dormant Lead Revival – príležitosti neaktívne 6+ mesiacov
export async function scanDormantLeads(agencyId: string): Promise<ShadowInventorySignal[]> {
  await requireEnterprise();
  const supabase = await createClient();

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const { data: dormantLeads } = await supabase
    .from('leads')
    .select('id, name, last_contact_at, score, status')
    .lt('last_contact_at', sixMonthsAgo.toISOString())
    .neq('status', 'Uzatvorený')
    .eq('agency_id', agencyId);

  if (!dormantLeads?.length) return [];

  const signals: ShadowInventorySignal[] = [];

  for (const lead of dormantLeads) {
    const reasoning = await generateDormantReasoning(lead);

    const { data: signal } = await supabase
      .from('shadow_inventory')
      .insert({
        agency_id: agencyId,
        lead_id: lead.id,
        signal_type: 'dormant_revival',
        confidence_score: calculateDormantConfidence(lead),
        ai_reasoning: reasoning,
        status: 'pending',
      })
      .select()
      .single();

    if (signal) {
      signals.push({
        id: signal.id,
        leadId: signal.lead_id,
        propertyId: null,
        signalType: 'dormant_revival',
        confidenceScore: signal.confidence_score,
        lifeStageTrigger: null,
        aiReasoning: reasoning,
        status: 'pending',
        createdAt: signal.created_at,
      });
    }
  }

  return signals;
}

function calculateDormantConfidence(lead: {
  score: number;
  last_contact_at: string;
}): number {
  const monthsInactive = Math.floor(
    (Date.now() - new Date(lead.last_contact_at).getTime()) /
    (1000 * 60 * 60 * 24 * 30)
  );

  // Vyššie skóre + kratšia neaktivita = vyššia šanca na revival
  const baseScore = lead.score * 0.6;
  const recencyBonus = Math.max(0, 40 - monthsInactive * 3);
  return Math.min(100, Math.round(baseScore + recencyBonus));
}

async function generateDormantReasoning(lead: {
  name: string;
  score: number;
  last_contact_at: string;
}): Promise<string> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{
      role: 'user',
      content: `Vygeneruj 1 krátku vetu (slovensky) prečo sa oplatí znovu kontaktovať
      príležitosť "${lead.name}" (AI skóre: ${lead.score}, neaktívna od: ${lead.last_contact_at}).
      Buď konkrétny a motivujúci pre makléra.`,
    }],
    max_tokens: 80,
    temperature: 0.3,
  });

  return response.choices[0]?.message?.content?.trim() ??
    `Príležitosť s históriou záujmu – vhodný čas na opätovný kontakt.`;
}
```

---

## KROK 6 – API ENDPOINTS

### src/app/api/l99/bri/route.ts

```typescript
import { NextResponse } from "next/server";
import { computeEnterpriseBri } from "@/lib/l99/bri-engine";
import { checkEnterpriseAccess } from "@/lib/l99/entitlements";
import type { BriComponents } from "@/lib/l99/types";

export async function POST(request: Request) {
  const access = await checkEnterpriseAccess();

  if (!access.allowed) {
    return NextResponse.json(
      {
        error: access.reason === 'locked_downgrade'
          ? 'BRI je zamknuté po downgrade. Obnovte Enterprise plán.'
          : 'Vyžaduje Enterprise plán.',
        currentTier: access.currentTier,
        upgradeUrl: '/billing',
      },
      { status: 403 }
    );
  }

  const body = await request.json() as {
    leadId: string;
    components: BriComponents;
    leadContext: { name: string; lastActivity: string };
  };

  const result = await computeEnterpriseBri(
    body.leadId,
    body.components,
    body.leadContext
  );

  return NextResponse.json(result);
}
```

### src/app/api/l99/shadow-inventory/route.ts

```typescript
import { NextResponse } from "next/server";
import { scanDormantLeads } from "@/lib/l99/shadow-inventory";
import { checkEnterpriseAccess } from "@/lib/l99/entitlements";
import { getCurrentProfile } from "@/lib/supabase/server";

export async function GET() {
  const access = await checkEnterpriseAccess();

  if (!access.allowed) {
    return NextResponse.json(
      { error: 'Vyžaduje Enterprise plán.', upgradeUrl: '/billing' },
      { status: 403 }
    );
  }

  const profile = await getCurrentProfile();
  if (!profile?.agency_id) {
    return NextResponse.json({ error: 'Profil nemá agency_id.' }, { status: 400 });
  }

  const signals = await scanDormantLeads(profile.agency_id);
  return NextResponse.json({ signals, count: signals.length });
}
```

---

## KROK 7 – UI: RADIANT ENTERPRISE LAYER

### Pridaj do globals.css:

```css
/* ============================================
   RADIANT ENTERPRISE LAYER – L99 Visual System
   ============================================ */

/* Indigo-Gold gradient pre enterprise features */
.radiant-glow-enterprise {
  background: linear-gradient(135deg,
    rgba(99, 102, 241, 0.15) 0%,
    rgba(245, 158, 11, 0.10) 100%
  );
  border: 1px solid rgba(99, 102, 241, 0.30);
  box-shadow:
    0 0 30px rgba(99, 102, 241, 0.15),
    0 0 60px rgba(245, 158, 11, 0.08);
}

.radiant-glow-enterprise:hover {
  box-shadow:
    0 0 40px rgba(99, 102, 241, 0.25),
    0 0 80px rgba(245, 158, 11, 0.12);
  transition: box-shadow 0.3s ease;
}

/* BRI Score badge farby */
.bri-critical { color: #EF4444; border-color: rgba(239,68,68,0.30); }
.bri-high     { color: #F59E0B; border-color: rgba(245,158,11,0.30); }
.bri-medium   { color: #6366F1; border-color: rgba(99,102,241,0.30); }
.bri-low      { color: #64748B; border-color: rgba(100,116,139,0.30); }

/* Locked state pre non-enterprise */
.enterprise-locked {
  filter: blur(4px);
  pointer-events: none;
  user-select: none;
}

.enterprise-locked-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(5, 9, 20, 0.85);
  backdrop-filter: blur(2px);
  border-radius: inherit;
  z-index: 10;
}
```

### src/components/l99/EnterpriseLockOverlay.tsx

```typescript
import Link from "next/link";
import type { AccountTier } from "@/lib/l99/types";

interface Props {
  currentTier: AccountTier;
  featureName: string;
  isLocked?: boolean; // downgrade lock
}

export default function EnterpriseLockOverlay({
  currentTier,
  featureName,
  isLocked = false,
}: Props) {
  return (
    <div className="enterprise-locked-overlay">
      <div className="text-center px-6">
        <p className="text-2xl mb-2">{isLocked ? '🔒' : '⭐'}</p>
        <p className="text-sm font-bold mb-1" style={{ color: '#F0F9FF' }}>
          {isLocked
            ? `${featureName} – zamknuté po downgrade`
            : `${featureName} – Enterprise only`}
        </p>
        <p className="text-xs mb-4" style={{ color: '#64748B' }}>
          {isLocked
            ? 'Obnoviť Enterprise plán pre obnovenie prístupu a histórie.'
            : `Aktuálny plán: ${currentTier}. Upgrade na Enterprise pre prístup.`}
        </p>
        <Link
          href="/billing"
          className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all hover:scale-105"
          style={{
            background: 'linear-gradient(135deg, #6366F1, #F59E0B)',
            color: '#fff',
          }}
        >
          ✦ Prejsť na Enterprise
        </Link>
      </div>
    </div>
  );
}
```

### src/components/l99/BriScoreCard.tsx

```typescript
"use client";
import { useState } from "react";
import type { BriResult } from "@/lib/l99/types";

interface Props {
  bri: BriResult;
  showReasoning?: boolean;
}

const LEVEL_LABELS = {
  critical: { label: '🔥 Kritická priorita', class: 'bri-critical' },
  high:     { label: '⚡ Vysoká priorita',   class: 'bri-high' },
  medium:   { label: '📊 Stredná priorita',  class: 'bri-medium' },
  low:      { label: '🔵 Nízka aktivita',    class: 'bri-low' },
};

export default function BriScoreCard({ bri, showReasoning = true }: Props) {
  const [expanded, setExpanded] = useState(false);
  const level = LEVEL_LABELS[bri.alertLevel];

  return (
    <div className="radiant-glow-enterprise rounded-2xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold uppercase tracking-wider"
           style={{ color: '#6366F1' }}>
          🧠 Buyer Readiness Index™
        </p>
        <span className={`text-xs font-bold rounded-full px-3 py-1 border ${level.class}`}
              style={{ background: 'rgba(0,0,0,0.3)' }}>
          {level.label}
        </span>
      </div>

      {/* Score */}
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-5xl font-extrabold"
              style={{ color: '#F0F9FF', fontFamily: 'var(--font-syne, sans-serif)' }}>
          {bri.score}
        </span>
        <span style={{ color: '#475569' }}>/100</span>
      </div>

      {/* EU AI Act Reasoning */}
      {showReasoning && (
        <p className="text-xs italic mb-4" style={{ color: '#94A3B8' }}>
          {bri.reasoningString}
        </p>
      )}

      {/* Components breakdown */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs mb-2 transition-colors hover:opacity-80"
        style={{ color: '#6366F1' }}
      >
        {expanded ? '▲ Skryť detaily' : '▼ Zobraziť faktory (AI transparentnosť)'}
      </button>

      {expanded && (
        <div className="space-y-2">
          {bri.reasoningFactors.map((factor, i) => (
            <div key={i}>
              <div className="flex justify-between text-xs mb-1">
                <span style={{ color: '#CBD5E1' }}>{factor.factor}</span>
                <span style={{ color: '#6366F1' }}>
                  {factor.contribution} bodov
                </span>
              </div>
              <div className="h-1.5 rounded-full" style={{ background: '#0F1F3D' }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${factor.value}%`,
                    background: 'linear-gradient(90deg, #6366F1, #F59E0B)',
                  }}
                />
              </div>
              <p className="text-xs mt-0.5" style={{ color: '#475569' }}>
                {factor.explanation}
              </p>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs mt-3" style={{ color: '#334155' }}>
        Vypočítané: {new Date(bri.calculatedAt).toLocaleString('sk-SK')}
        {' · '}
        <span style={{ color: '#475569' }}>EU AI Act compliant</span>
      </p>
    </div>
  );
}
```

---

## KROK 8 – BILLING WEBHOOK: Downgrade Logic

V `src/lib/billing-store.ts` v `handleStripeWebhookEvent` pridaj:

```typescript
// Pridaj do existujúceho handleStripeWebhookEvent:
if (event.type === "customer.subscription.deleted" ||
    event.type === "customer.subscription.updated") {

  const subscription = object as Stripe.Subscription;

  // Zisti či ide o downgrade z Enterprise
  const priceId = subscription.items.data[0]?.price.id;
  const isEnterprisePriceId = priceId === process.env.STRIPE_PRICE_ENTERPRISE;

  if (!isEnterprisePriceId && event.type === "customer.subscription.updated") {
    // Downgrade – zamkni enterprise dáta
    const supabase = await createServerClient();

    await supabase
      .from('profiles')
      .update({
        account_tier: 'pro', // alebo podľa nového price ID
        tier_locked_at: new Date().toISOString(),
        tier_downgraded_from: 'enterprise',
      })
      .eq('stripe_customer_id', object.customer as string);
  }
}
```

---

## DEPLOY & VERIFY

```bash
# 1. SQL migrácia v Supabase SQL Editor

# 2. Pridaj env variables do .env.local

# 3. Reštartuj server
taskkill /F /IM node.exe
cd C:\RealitkaAI\apps\crm
npm run dev

# 4. Test Enterprise check
# curl -X POST http://localhost:3000/api/l99/bri
# → Bez Enterprise: 403 + upgradeUrl
# → S Enterprise: BRI result + reasoning

# 5. Test Shadow Inventory
# GET http://localhost:3000/api/l99/shadow-inventory
# → Vráti dormant leads so signálmi

# 6. Build verifikácia
npm run build
# Musí prejsť bez TypeScript chýb
```

---

## ROLLBACK

```bash
# DB rollback:
ALTER TABLE profiles DROP COLUMN IF EXISTS account_tier;
ALTER TABLE profiles DROP COLUMN IF EXISTS tier_locked_at;
DROP TABLE IF EXISTS bri_history;
DROP TABLE IF EXISTS shadow_inventory;
DROP TABLE IF EXISTS priority_alerts;

# Code rollback:
git revert HEAD
npm run dev
```

---

## RIZIKÁ & MITIGÁCIE

| Riziko | Mitigácia |
|--------|-----------|
| OpenAI timeout pri BRI reasoning | Fallback string bez AI |
| Twilio SMS zlyhá | In-app alert ako fallback |
| BRI weights nesumujú 1.0 | Runtime validácia v types.ts |
| Enterprise check obídený | RLS na DB úrovni ako second layer |
| EU AI Act compliance | reasoningString + reasoningFactors povinné |
