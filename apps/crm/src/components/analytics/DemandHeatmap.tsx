"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

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
};

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

export default function DemandHeatmap({ demandData, supplyData, detectedGap }: DemandHeatmapProps) {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current || !mapboxgl.accessToken) return;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [21.26, 48.99],
      zoom: 12,
      pitch: 45,
    });
    mapRef.current = map;

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
  }, [demandData, supplyData]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const demandSource = map.getSource("demand") as mapboxgl.GeoJSONSource | undefined;
    if (demandSource) demandSource.setData(demandData);
    const supplySource = map.getSource("supply") as mapboxgl.GeoJSONSource | undefined;
    if (supplySource) supplySource.setData(supplyData);
  }, [demandData, supplyData]);

  if (!mapboxgl.accessToken) {
    return (
      <div className="relative h-[600px] w-full overflow-hidden rounded-[3rem] border border-white/10 bg-black/60 p-6 text-slate-300">
        <p className="text-sm font-semibold">Mapbox nie je nakonfigurovaný.</p>
        <p className="mt-2 text-xs text-slate-400">
          Doplň `NEXT_PUBLIC_MAPBOX_TOKEN`, aby sa zobrazila heatmapa pre L99 Radar príležitostí.
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-[600px] w-full overflow-hidden rounded-[3rem] border border-white/10">
      <div ref={mapContainer} className="absolute inset-0" />

      <div className="absolute left-6 top-6 z-10 rounded-3xl border border-white/5 bg-black/80 p-6 backdrop-blur-xl">
        <h4 className="mb-4 text-[10px] font-black uppercase tracking-widest text-white">L99 Radar príležitostí</h4>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 animate-pulse rounded-full bg-red-500" />
            <span className="text-[9px] uppercase text-slate-400">Vysoký dopyt (Kupujúci)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-blue-500" />
            <span className="text-[9px] uppercase text-slate-400">Aktuálna ponuka (Supply)</span>
          </div>
        </div>
        {detectedGap ? (
          <div className="mt-4 border-t border-white/5 pt-4">
            <p className="text-[9px] font-black italic text-yellow-500">DETECTED GAP: {detectedGap}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
