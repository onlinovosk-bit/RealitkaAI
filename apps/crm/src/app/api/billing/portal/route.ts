import { NextResponse } from "next/server";
import { createCustomerPortalSession } from "@/lib/billing-store";

export async function POST() {
  try {
    const result = await createCustomerPortalSession();

    if (!result.hasStripeConfigured) {
      return NextResponse.json(
        {
          ok: false,
          error: "Platobný systém nie je nakonfigurovaný. Kontaktujte podporu.",
          code: "STRIPE_NOT_CONFIGURED",
        },
        { status: 503 }
      );
    }

    if (!result.hasCustomer) {
      return NextResponse.json(
        {
          ok: false,
          error: "Nemáte ešte aktívne predplatné. Najprv si vyberte plán na stránke Predplatné.",
          code: "NO_CUSTOMER",
        },
        { status: 404 }
      );
    }

    if (!result.url) {
      return NextResponse.json(
        {
          ok: false,
          error: "Nepodarilo sa vytvoriť odkaz na portál predplatného. Skúste to znova.",
          code: "PORTAL_URL_MISSING",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, result }, { status: 200 });
  } catch (error) {
    console.error("Billing portal error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Nepodarilo sa otvoriť stránku predplatného. Skúste to znova neskôr.",
      },
      { status: 500 }
    );
  }
}
