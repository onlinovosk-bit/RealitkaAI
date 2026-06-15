"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapPin, Layers } from "lucide-react";
import { DEFAULT_MAP_STYLE_URL } from "@/lib/license/capability-registry";
import { WmsParcelSource } from "@/lib/cadastre/WmsParcelSource";
import type { ParcelInfo, ParcelSource } from "@/lib/cadastre/ParcelSource";

const DEFAULT_CENTER: [number, number] = [20.2973, 49.0584];
const DEFAULT_ZOOM = 12;

type CadastreMapViewProps = {
  title: string;
  subtitle: string;
  source?: ParcelSource;
  initialCenter?: [number, number];
};

async function geocodeAddress(address: string): Promise<[number, number] | null> {
  const query = address.trim();
  if (!query) return null;
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const body = (await response.json()) as Array<{ lon?: string; lat?: string }>;
    const top = body[0];
    if (!top?.lon || !top?.lat) return null;
    const lng = Number(top.lon);
    const lat = Number(top.lat);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
    return [lng, lat];
  } catch {
    return null;
  }
}

export function CadastreMapView({
  title,
  subtitle,
  source = new WmsParcelSource(),
  initialCenter = DEFAULT_CENTER,
}: CadastreMapViewProps) {
  const mapNodeRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [parcelInfo, setParcelInfo] = useState<ParcelInfo | null>(null);
  const [layerUnavailable, setLayerUnavailable] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);
  const [resolvedCenter, setResolvedCenter] = useState<[number, number]>(initialCenter);

  const overlayLayer = useMemo(() => source.getMapLayer({ useFallback: usingFallback }), [source, usingFallback]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const lat = Number(params.get("leadLat"));
    const lng = Number(params.get("leadLng"));
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      setResolvedCenter([lng, lat]);
      return;
    }
    const leadAddress = params.get("leadAddress");
    if (!leadAddress) return;
    geocodeAddress(leadAddress).then((center) => {
      if (center) setResolvedCenter(center);
    });
  }, []);

  useEffect(() => {
    if (!mapNodeRef.current) return;

    const map = new maplibregl.Map({
      container: mapNodeRef.current,
      style: DEFAULT_MAP_STYLE_URL,
      center: resolvedCenter,
      zoom: DEFAULT_ZOOM,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl(), "bottom-right");

    map.on("load", () => {
      map.addSource(overlayLayer.sourceId, {
        type: "raster",
        tiles: [overlayLayer.tileUrlTemplate],
        tileSize: 256,
        attribution: overlayLayer.attribution,
      });
      map.addLayer({
        id: overlayLayer.layerId,
        type: "raster",
        source: overlayLayer.sourceId,
        paint: { "raster-opacity": 0.75 },
      });
    });

    map.on("error", () => {
      if (usingFallback) {
        setLayerUnavailable(true);
        return;
      }
      setUsingFallback(true);
    });

    map.on("click", async (event) => {
      const info = await source.getParcelAtPoint(event.lngLat.lat, event.lngLat.lng);
      setParcelInfo(info);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [overlayLayer, resolvedCenter, source, usingFallback]);

  return (
    <section className="overflow-hidden rounded-[2.5rem] border border-white/10 bg-[#07070D] p-5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-black uppercase tracking-[0.15em] text-white">{title}</h3>
          <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-blue-300">
          <Layers size={14} /> Display only
        </div>
      </div>

      <div className="relative h-[420px] overflow-hidden rounded-3xl border border-white/10 bg-black/20">
        <div ref={mapNodeRef} className="absolute inset-0" />

        {layerUnavailable ? (
          <div className="pointer-events-none absolute left-4 top-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-amber-200">
            parcelna vrstva docasne nedostupna
          </div>
        ) : null}

        {parcelInfo ? (
          <div className="absolute bottom-4 left-4 max-w-[280px] rounded-2xl border border-blue-400/30 bg-[#03040A]/90 p-3 text-[11px] text-slate-200 shadow-xl">
            <div className="mb-2 flex items-center gap-2 text-blue-300">
              <MapPin size={12} />
              <span className="font-bold uppercase tracking-widest">Parcela</span>
            </div>
            <p>
              Cislo: <span className="font-semibold text-white">{parcelInfo.parcelNumber}</span>
            </p>
            <p>
              Vymera:{" "}
              <span className="font-semibold text-white">
                {parcelInfo.areaM2 !== null ? `${parcelInfo.areaM2.toFixed(0)} m2` : "n/a"}
              </span>
            </p>
            <p>
              Kat. uzemie: <span className="font-semibold text-white">{parcelInfo.cadastralUnit ?? "n/a"}</span>
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
