"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { SLATE_HORIZON, WORKDESK_CARD } from "@/lib/slate-horizon-theme";
import { DEFAULT_MAP_STYLE_URL } from "@/lib/license/capability-registry";
import { PremiumLockedBlur, PremiumLockedOverlay } from "@/components/license/PremiumLockedOverlay";

type FeatureCollection = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    geometry: { type: "Point"; coordinates: [number, number] };
    properties: { search_weight: number };
  }>;
};

type DemandHeatmapProps = {
  demandData: FeatureCollection;
  supplyData: FeatureCollection;
  detectedGap?: string | null;
  canViewDetails?: boolean;
};

export default function DemandHeatmap({
  demandData,
  supplyData,
  detectedGap,
  canViewDetails = true,
}: DemandHeatmapProps) {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const pointCount = demandData.features.length + supplyData.features.length;
  const hasGeoData = pointCount > 0;

  useEffect(() => {
    if (!hasGeoData || !mapContainer.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: DEFAULT_MAP_STYLE_URL,
      center: [21.26, 48.99],
      zoom: 12,
      pitch: 45,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl(), "bottom-right");

    map.on("load", () => {
      map.addSource("demand", { type: "geojson", data: demandData });
      map.addLayer({
        id: "demand-heat",
        type: "heatmap",
        source: "demand",
        paint: {
          "heatmap-weight": ["get", "search_weight"],
          "heatmap-intensity": 1,
          "heatmap-color": [
            "interpolate", ["linear"], ["heatmap-density"],
            0, "rgba(0,0,255,0)",
            0.2, "rgba(0,255,255,0.5)",
            0.4, "rgba(0,255,0,0.5)",
            0.6, "rgba(255,255,0,0.5)",
            1, "rgba(255,0,0,0.8)",
          ],
          "heatmap-radius": 30,
          "heatmap-opacity": 0.6,
        },
      });

      map.addSource("supply", { type: "geojson", data: supplyData });
      map.addLayer({
        id: "supply-circles",
        type: "circle",
        source: "supply",
        paint: {
          "circle-radius": 5,
          "circle-color": "#3b82f6",
          "circle-stroke-width": 1,
          "circle-stroke-color": "#ffffff",
          "circle-opacity": 0.4,
        },
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [demandData, supplyData, hasGeoData]);

  useEffect(() => {
    if (!hasGeoData) return;
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const demandSource = map.getSource("demand") as maplibregl.GeoJSONSource | undefined;
    if (demandSource) demandSource.setData(demandData);
    const supplySource = map.getSource("supply") as maplibregl.GeoJSONSource | undefined;
    if (supplySource) supplySource.setData(supplyData);
  }, [demandData, supplyData, hasGeoData]);

  return (
    <div
      className="relative h-[600px] w-full overflow-hidden rounded-3xl border"
      style={{ borderColor: WORKDESK_CARD.borderColor, boxShadow: WORKDESK_CARD.boxShadow }}
    >
      {!hasGeoData ? (
        <div
          className="absolute inset-0 z-[5] flex flex-col items-center justify-center px-8 text-center"
          style={{ background: SLATE_HORIZON.bg }}
        >
          <p className="text-sm font-semibold" style={{ color: SLATE_HORIZON.ink }}>
            Žiadne body na mape dopytu
          </p>
          <p className="mt-2 max-w-md text-xs leading-relaxed" style={{ color: SLATE_HORIZON.muted }}>
            Heatmapa číta lokality z príležitostí a ponúk v CRM (nie simulované sektory). Importujte alebo
            doplňte lokalitu — potom sa zobrazí dopyt (červená) a ponuka (modrá).
          </p>
        </div>
      ) : (
        <PremiumLockedBlur active={!canViewDetails}>
          <div ref={mapContainer} className="absolute inset-0" />
        </PremiumLockedBlur>
      )}

      <div
        className="absolute left-6 top-6 z-10 rounded-3xl border p-6"
        style={{
          background: "rgba(255,255,255,0.94)",
          borderColor: SLATE_HORIZON.line,
          boxShadow: WORKDESK_CARD.boxShadow,
        }}
      >
        <h4 className="mb-4 text-[10px] font-black uppercase tracking-widest" style={{ color: SLATE_HORIZON.ink }}>
          Radar dopytu a ponuky
        </h4>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 animate-pulse rounded-full bg-red-500" />
            <span className="text-[9px] uppercase" style={{ color: SLATE_HORIZON.muted }}>Vysoký dopyt (Kupujúci)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-blue-500" />
            <span className="text-[9px] uppercase" style={{ color: SLATE_HORIZON.muted }}>Aktuálna ponuka (Supply)</span>
          </div>
        </div>
        {detectedGap ? (
          <div className="mt-4 border-t pt-4" style={{ borderColor: SLATE_HORIZON.line }}>
            <p className="text-[9px] font-black italic" style={{ color: SLATE_HORIZON.amber }}>
              DETECTED GAP: {detectedGap}
            </p>
          </div>
        ) : null}
      </div>

      {!canViewDetails ? (
        <PremiumLockedOverlay
          capability="canViewDemandHeatmap"
          headline="V tejto zóne práve vzniká dopytový pretlak."
          subline="Chceš vidieť presné ulice a zoznam čakajúcich kupcov? Odomkni Market Vision."
        />
      ) : null}
    </div>
  );
}
