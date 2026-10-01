import { describe, expect, it, vi, afterEach } from "vitest";
import { NotSupportedError } from "@/lib/cadastre/ParcelSource";
import { WmsParcelSource } from "@/lib/cadastre/WmsParcelSource";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("WmsParcelSource", () => {
  it("builds INSPIRE WMS overlay URL for primary source", () => {
    const source = new WmsParcelSource();
    const layer = source.getMapLayer();

    expect(layer.sourceType).toBe("wms");
    expect(layer.tileUrlTemplate).toContain("service=WMS");
    expect(layer.tileUrlTemplate).toContain("request=GetMap");
    expect(layer.tileUrlTemplate).toContain("layers=cp%3ACadastralParcel");
  });

  it("builds ArcGIS tile URL for fallback source", () => {
    const source = new WmsParcelSource();
    const layer = source.getMapLayer({ useFallback: true });

    expect(layer.sourceType).toBe("arcgis");
    expect(layer.tileUrlTemplate).toContain("/MapServer/export");
    expect(layer.tileUrlTemplate).toContain("bbox={bbox-epsg-3857}");
  });

  it("parses parcel info from WMS GetFeatureInfo json", async () => {
    const source = new WmsParcelSource();
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        features: [
          {
            properties: {
              nationalCadastralReference: "123/45",
              areaValue: 410,
              cadastralUnitName: "Poprad",
            },
          },
        ],
      }),
    } as Response);

    const info = await source.getParcelAtPoint(49.05, 20.29);
    expect(info).toEqual({
      parcelNumber: "123/45",
      areaM2: 410,
      cadastralUnit: "Poprad",
    });
    expect(info && "owner" in info).toBe(false);
  });

  it("falls back to ArcGIS identify when WMS request fails", async () => {
    const source = new WmsParcelSource();
    vi.spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(new Error("wms timeout"))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [
            {
              attributes: {
                PARCELA: "778/2",
                VYMERA: 502,
                KATASTER: "Presov",
              },
            },
          ],
        }),
      } as Response);

    const info = await source.getParcelAtPoint(49.0, 21.2);
    expect(info).toEqual({
      parcelNumber: "778/2",
      areaM2: 502,
      cadastralUnit: "Presov",
    });
  });

  it("throws NotSupportedError for future lead query API", async () => {
    const source = new WmsParcelSource();
    await expect(source.getParcelsForLead({ leadId: "lead-1" })).rejects.toBeInstanceOf(NotSupportedError);
  });
});
