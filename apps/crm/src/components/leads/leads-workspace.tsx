"use client";

import { useEffect, useState } from "react";
import type { Lead } from "@/lib/leads-store";
import LeadTable from "@/components/leads/lead-table";
import { LeadCardList } from "@/components/leads/LeadCardMobile";

export default function LeadsWorkspace({ leads }: { leads: Lead[] }) {
  const [items, setItems] = useState(leads);

  useEffect(() => {
    setItems(leads);
  }, [leads]);

  const handleDelete = (id: string) => setItems((cur) => cur.filter((item) => item.id !== id));

  return (
    <>
      {/* Mobile card list */}
      <div className="md:hidden">
        <LeadCardList leads={items} />
      </div>
      {/* Desktop table */}
      <div className="hidden md:block">
        <LeadTable leads={items} onDelete={handleDelete} />
      </div>
    </>
  );
}