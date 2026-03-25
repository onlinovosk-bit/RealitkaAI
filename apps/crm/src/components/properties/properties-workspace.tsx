"use client";

import { useEffect, useMemo, useState } from "react";
import type { Property } from "@/lib/properties-store";
import PropertiesTable from "@/components/properties/properties-table";
import PropertyEditSlideOver from "@/components/properties/property-edit-slide-over";

export default function PropertiesWorkspace({
  properties,
}: {
  properties: Property[];
}) {
  const [items, setItems] = useState(properties);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setItems(properties);
  }, [properties]);

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => b.price - a.price);
  }, [items]);

  function openEdit(property: Property) {
    setSelectedProperty(property);
    setIsOpen(true);
  }

  return (
    <>
      <PropertiesTable properties={sorted} onEdit={openEdit} />

      <PropertyEditSlideOver
        property={selectedProperty}
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
          setSelectedProperty(null);
        }}
        onSaved={(updatedProperty) => {
          setItems((current) =>
            current.map((item) =>
              item.id === updatedProperty.id ? updatedProperty : item
            )
          );
          setSelectedProperty(updatedProperty);
        }}
        onDeleted={(deletedId) => {
          setItems((current) => current.filter((item) => item.id !== deletedId));
          setSelectedProperty(null);
          setIsOpen(false);
        }}
      />
    </>
  );
}
