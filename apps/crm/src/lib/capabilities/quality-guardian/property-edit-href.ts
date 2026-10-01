/** Deep-link z Guardian panelu na edit konkrétnej ponuky (slide-over na /properties). */
export function buildGuardianPropertyEditHref(sourceId: string): string {
  const id = sourceId.trim();
  if (!id) return "/properties";
  const params = new URLSearchParams({ source_id: id, edit: "1" });
  return `/properties?${params.toString()}`;
}
