// src/infra/outbound/SimpleOutboundContentBuilder.ts

import type {
  OutboundCampaign,
  OutboundContentBuilder,
  OutboundRecipient,
} from "@/domain/outbound/OutboundCampaign";

export class SimpleOutboundContentBuilder implements OutboundContentBuilder {
  async buildMessage(
    recipient: OutboundRecipient,
    _campaign: OutboundCampaign,
  ): Promise<{ subject: string; body: string }> {
    const subject = `Revolis.AI — inteligentný CRM pre ${recipient.name}`;

    const body = `Dobrý deň,

obraciam sa na Vás v mene Revolis.AI — platforny navrhnutej priamo pre realitné agentúry na Slovensku.

Vieme, že každá agentúra čelí rovnakým výzvam: sledovanie leadov, komunikácia s klientmi a reportovanie výsledkov zaberá príliš veľa času. Revolis.AI to rieši:

• Automatický scoring leadov — okamžite vidíte, kto je pripravený kúpiť
• Centralizovaná komunikácia — email, SMS a hovory na jednom mieste
• Prehľadné reporty — výkon celého tímu v reálnom čase

Rezervujte si 15-minútové demo a ukážeme Vám, ako agentúry ako ${recipient.name} skracujú čas na uzavretie obchodu o 30 %.

Rezervujte demo: https://revolis.ai/demo

S pozdravom,
Tím Revolis.AI
https://revolis.ai`;

    return { subject, body };
  }
}

export function createSimpleOutboundContentBuilder(): OutboundContentBuilder {
  return new SimpleOutboundContentBuilder();
}
