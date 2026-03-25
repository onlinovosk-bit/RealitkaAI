"use client";

import { useEffect, useState } from "react";
import type { Lead } from "@/lib/leads-store";
import LeadTable from "@/components/leads/lead-table";

export default function LeadsWorkspace({ leads }: { leads: Lead[] }) {
  const [items, setItems] = useState(leads);

  useEffect(() => {
    setItems(leads);
  }, [leads]);

  return (
    <LeadTable
      leads={items}
      onDelete={(id) => {
        setItems((current) => current.filter((item) => item.id !== id));
      }}
    />
  );
}