import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CadastreMapView } from "@/components/l99/CadastreMapView";
import type { ParcelSource, WmsLayerConfig } from "@/lib/cadastre/ParcelSource";

vi.mock("maplibre-gl", () => {
  class MapMock {
    constructor() {}
    on(event: string, cb: (...args: unknown[]) => void) {
      if (event === "load" || event === "error") {
        cb();
      }
      return this;
    }
    addControl() {}
    addSource() {}
    addLayer() {}
    remove() {}
  }

  return {
    default: {
      Map: MapMock,
      NavigationControl: class {},
    },
  };
});

function createLayer(sourceId: string): WmsLayerConfig {
  return {
    sourceId,
    layerId: `${sourceId}-layer`,
    sourceType: "wms",
    tileUrlTemplate: "https://example.com/wms",
    attribution: "test",
  };
}

describe("CadastreMapView", () => {
  it("shows graceful outage note when overlay fails even after fallback", async () => {
    const source: ParcelSource = {
      getMapLayer: ({ useFallback } = {}) => createLayer(useFallback ? "fallback" : "primary"),
      getParcelAtPoint: async () => null,
      getParcelsForLead: async () => {
        throw new Error("unused");
      },
    };

    render(<CadastreMapView title="Bod zlomu" subtitle="Display-only" source={source} />);

    await waitFor(() => {
      expect(screen.getByText("parcelna vrstva docasne nedostupna")).toBeInTheDocument();
    });
    expect(screen.getByText("Display only")).toBeInTheDocument();
  });
});
